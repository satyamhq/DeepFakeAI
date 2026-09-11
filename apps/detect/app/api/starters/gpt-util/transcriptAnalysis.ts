import nodeFetch from "node-fetch"
import OpenAI, { toFile } from "openai"
import { MediaTrack } from "../../../data/media"
import { requireEnv } from "../../util"
import { YesNo, YesNoResponse } from "../../../model-processors/openai"
import { chatOpenAI } from "./chatOpenAI"
import { transcriptPrompt } from "./transcriptPrompt"

import { GoogleGenerativeAI } from "@google/generative-ai"

async function getTranscript(media: MediaTrack): Promise<string> {
  if (!media.url) {
    throw new Error(`getTranscript: Missing media URL [id=${media.id}]`)
  }

  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (geminiKey) {
    try {
      const mediaRsp = await nodeFetch(media.url)
      if (mediaRsp.ok) {
        const buffer = await mediaRsp.buffer()
        const base64 = buffer.toString("base64")
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" })
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: media.mimeType || "audio/mp3",
              data: base64,
            },
          },
          { text: "Transcribe the spoken audio verbatim in its original language. Return only the transcription." },
        ])
        const text = result.response.text()
        if (text) return text
      }
    } catch (e) {
      console.warn("Gemini transcription failed, trying fallback:", e)
    }
  }

  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const mediaRsp = await nodeFetch(media.url)
      if (!mediaRsp.ok) {
        const detail = await mediaRsp.text()
        throw new Error(`getTranscript: Failed to download media [url=${media.url}, error=${detail}]`)
      }
      if (mediaRsp.body) {
        const transcription = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file: await toFile(mediaRsp.body, media.file),
        })
        return transcription?.text ?? ""
      }
    } catch (e) {
      console.warn("OpenAI transcription failed:", e)
    }
  }

  return ""
}

// ChatGPT likes to return emojis in the transcript, which is nonsense, so we filter them out
// Example transcript we've seen:
// "👍👍👍👍👍👍👍www 😈👍😈😈😈👍Annoyed 😌😌😌😌😌 paw 😩😍😍😍😍 😈😍😍😍😍😍 👍👍 😈😍😍 😍😍😍"
function filterUnicode(transcript: string) {
  const pattern = new RegExp(
    "[" +
      "\u{1F600}-\u{1F64F}" + // emoticons
      "\u{1F300}-\u{1F5FF}" + // symbols & pictographs
      "\u{1F680}-\u{1F6FF}" + // transport & map symbols
      "\u{1F1E0}-\u{1F1FF}" + // flags (iOS)
      "\u{2700}-\u{27BF}" + // dingbats
      "\u{24C2}-\u{1F251}" + // various additional symbols
      "\u{1F900}-\u{1F9FF}" + // supplemental symbols & pictographs
      "\u{1FA70}-\u{1FAFF}" + // symbols & pictographs extended-A
      "\u{1F018}-\u{1F270}" + // additional symbols
      "]",
    "gu",
  )

  return transcript.replace(pattern, "")
}

async function askAboutSongLyrics(transcript: string): Promise<YesNoResponse | undefined> {
  const chatResponse = await chatOpenAI({
    userMessage: `You will be given a transcript of an audio clip. Return YES if the transcript is made up of song lyrics. Return NO otherwise. Then return a rationale for that answer. Transcript: ${transcript}`,
    temperature: 0.2,
  })
  if (!chatResponse) {
    return undefined
  }

  const answer = chatResponse.text
  if (answer.startsWith(YesNo.YES)) {
    return {
      answer: YesNo.YES,
      lyricsPromptResponse: answer,
    }
  } else if (answer.startsWith(YesNo.NO)) {
    return {
      answer: YesNo.NO,
      lyricsPromptResponse: answer,
    }
  }

  return undefined
}

async function askAboutTranscript(transcript: string): Promise<YesNoResponse | undefined> {
  const chatResponse = await chatOpenAI({
    userMessage: transcriptPrompt(transcript),
    temperature: 0.2,
  })
  if (!chatResponse) {
    return undefined
  }

  const analysis = parseAnalysis(chatResponse.text)
  if (analysis.label.toLowerCase().startsWith("fake")) {
    return {
      answer: YesNo.YES,
      rationale: analysis.rationale,
      requestId: chatResponse.requestId,
    }
  } else if (analysis.label.toLowerCase().startsWith("real")) {
    return {
      answer: YesNo.NO,
      rationale: analysis.rationale,
      requestId: chatResponse.requestId,
    }
  } else if (analysis.label.toLowerCase().startsWith("unknown")) {
    return {
      answer: YesNo.UNKNOWN,
      rationale: analysis.rationale,
      requestId: chatResponse.requestId,
    }
  }

  return undefined
}

function parseAnalysis(analysis: string) {
  const analysisLines = analysis.split("\n")

  let rationale = ""
  let label = ""

  // We default to parsing text as "rationale," since sometimes GPT is missing
  // the "Transcript:" and "Rationale:" labels completely. When this happens
  // we've observed that the unlabeled part of the response is the rationale.
  let currentSection: "transcript" | "rationale" | "label" = "rationale"
  analysisLines.forEach((line) => {
    if (line.startsWith("Transcript:")) {
      currentSection = "transcript"
    } else if (line.startsWith("Rationale:")) {
      currentSection = "rationale"
      rationale = line.replace("Rationale:", "").trim()
    } else if (line.startsWith("Label:")) {
      currentSection = "label"
      label = line.replace("Label:", "").trim()
    } else {
      if (currentSection === "rationale") {
        rationale += " " + line.trim()
      } else if (currentSection === "label") {
        label += " " + line.trim()
      }
    }
  })

  return {
    rationale: rationale.trim(),
    label: label.trim(),
  }
}

const countWords = (text: string) => text.trim().split(/\s+/).length

export async function performTranscriptAnalysis(media: MediaTrack): Promise<YesNoResponse | undefined> {
  const transcript = await getTranscript(media)

  if (!transcript) {
    return { answer: YesNo.UNKNOWN }
  }

  // Analysis doesn't perform well on transcripts with emojis
  const filteredTranscript = filterUnicode(transcript)

  // Analysis doesn't perform well on very short transcripts
  if (countWords(filteredTranscript) < 15) {
    return { answer: YesNo.UNKNOWN }
  }

  // Don't ask about song lyrics, since it creates errors
  const songLyricsResult = await askAboutSongLyrics(filteredTranscript)
  if (songLyricsResult?.answer === YesNo.YES) {
    return {
      answer: YesNo.UNKNOWN,
      lyricsPromptResponse: songLyricsResult.lyricsPromptResponse,
    }
  }

  const result = await askAboutTranscript(filteredTranscript)
  if (!result) {
    return result
  }

  return {
    ...result,
    transcript, // include the original transcript
    lyricsPromptResponse: songLyricsResult?.lyricsPromptResponse,
  }
}
