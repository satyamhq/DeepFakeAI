import { RequestState } from "@prisma/client"
import { MediaTrack } from "../../data/media"
import { response } from "../../data/model"
import { ApiAuthInfo } from "../apiKey"
import { processors, YesNo, YesNoResponse } from "../../model-processors/openai"
import { chatOpenAI } from "./gpt-util/chatOpenAI"
import { performTranscriptAnalysis } from "./gpt-util/transcriptAnalysis"
import { complete } from "./util"
import { Starter } from "./types"

export const textQuestion =
  "Is this image at least 20% covered by overlaid text? Do not count text in the photograph itself."

export const startTextAnalysis: Starter = (media, userId, priority, apiAuthInfo) => {
  const performAnalysis = async () => await askYesNoAboutMedia(textQuestion, media.url)
  return startQuestionAnalysis("openai-text", media, userId, performAnalysis, apiAuthInfo)
}

export const startArtworkAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  const artworkQuestion =
    "Is this image an animation, sketch, painting, drawing, cartoon, courtroom sketch, or infographic? Please say NO if it is a photorealistic image or a photograph. Whether or not the image seems AI-generated is not important."
  const performAnalysis = async () => await askYesNoAboutMedia(artworkQuestion, media.url, 0)
  return startQuestionAnalysis("openai-artwork", media, userId, performAnalysis, apiAuthInfo)
}

export const startTranscriptAnalysis: Starter = async (media, userId, priority, apiAuthInfo) => {
  const performAnalysis = async () => await performTranscriptAnalysis(media)
  return startQuestionAnalysis("transcript", media, userId, performAnalysis, apiAuthInfo)
}

// GPT might format its response as "YES. Blah blah" or "YES, Blah blah" or "YES Blah blah". So we have to do some
// heuristic pruning to remove the "YES" and just get the "Blah blah".
export function trimRationale(text: string, prefixLength: number) {
  if (text[prefixLength] == "." || text[prefixLength] == ",") prefixLength += 1
  return text.substring(prefixLength).trimStart()
}

export async function askYesNoAboutMedia(
  question: string,
  urlOrBase64: string,
  temperature?: number,
  additionalJson?: Record<string, any>,
): Promise<YesNoResponse | undefined> {
  const chatResponse = await chatOpenAI({
    systemMessage: "Return your answer as a single word YES or NO best guess, followed by a rationale for that answer.",
    userMessage: question,
    temperature,
    imageUrlOrBase64: urlOrBase64,
  })
  if (chatResponse) {
    const answer = chatResponse.text
    if (answer.startsWith(YesNo.YES)) {
      return {
        answer: YesNo.YES,
        rationale: trimRationale(answer, 3),
        requestId: chatResponse.requestId,
        ...additionalJson,
      }
    } else if (answer.startsWith(YesNo.NO)) {
      return {
        answer: YesNo.NO,
        rationale: trimRationale(answer, 2),
        requestId: chatResponse.requestId,
        ...additionalJson,
      }
    }
  }

  return undefined
}

async function startQuestionAnalysis(
  source: keyof typeof processors,
  media: MediaTrack,
  userId: string,
  performYesNoAnalysis: () => Promise<YesNoResponse | undefined>,
  apiAuthInfo: ApiAuthInfo,
) {
  if (!process.env.OPENAI_API_KEY) return response.error("OpenAI API key not configured")

  const started = new Date()
  const fail = (msg: string, json: Record<string, any>) =>
    complete(
      media.id,
      source,
      userId,
      started,
      undefined,
      RequestState.ERROR,
      { error: msg, detail: json },
      apiAuthInfo,
    )

  try {
    const result = await performYesNoAnalysis()
    return result
      ? complete(media.id, source, userId, started, result.requestId, RequestState.COMPLETE, result, apiAuthInfo)
      : fail("Did not get yes or no answer from ChatGPT", {})
  } catch (error) {
    return fail("Failed to perform OpenAI analysis", { cause: `${error}` })
  }
}
