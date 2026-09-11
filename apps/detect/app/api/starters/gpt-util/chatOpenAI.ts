import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import { canParseUrl } from "../../util"

export type ChatResponse = {
  requestId: string
  text: string
}

export async function chatOpenAI({
  systemMessage,
  userMessage,
  temperature,
  imageUrlOrBase64,
}: {
  systemMessage?: string
  userMessage: string
  temperature?: number
  imageUrlOrBase64?: string
}): Promise<ChatResponse | undefined> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  // 1. Google Gemini (Preferred)
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        systemInstruction: systemMessage,
        generationConfig: {
          temperature: typeof temperature === "number" ? Math.min(Math.max(temperature, 0), 2) : 0.2,
        },
      })

      const parts: Array<any> = [{ text: userMessage }]

      if (imageUrlOrBase64) {
        if (imageUrlOrBase64.startsWith("data:")) {
          const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            })
          }
        } else if (canParseUrl(imageUrlOrBase64)) {
          try {
            const res = await fetch(imageUrlOrBase64)
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer()
              const base64 = Buffer.from(arrayBuf).toString("base64")
              const mimeType = res.headers.get("content-type") || "image/jpeg"
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64,
                },
              })
            }
          } catch (e) {
            console.warn("Could not fetch media url for Gemini multimodal analysis:", e)
          }
        }
      }

      const result = await model.generateContent(parts)
      const text = result.response.text()
      if (text) {
        return {
          requestId: `gemini-${Date.now()}`,
          text,
        }
      }
    } catch (err: any) {
      console.warn("Gemini generation error:", err?.message || err)
    }
  }

  // 2. OpenAI Fallback
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      let temp = temperature
      if (typeof temp === "number") {
        if (temp > 2) temp = 2
        if (temp < 0) temp = 0
      }

      const systemRole: OpenAI.Chat.Completions.ChatCompletionMessageParam | undefined = systemMessage
        ? { role: "system", content: systemMessage }
        : undefined

      const userText: OpenAI.Chat.Completions.ChatCompletionContentPart = {
        type: "text",
        text: userMessage,
      }

      const userImageUrl: OpenAI.Chat.Completions.ChatCompletionContentPart | undefined = imageUrlOrBase64
        ? {
            type: "image_url",
            image_url: {
              url: canParseUrl(imageUrlOrBase64) ? imageUrlOrBase64 : `data:image/jpeg;base64,${imageUrlOrBase64}`,
            },
          }
        : undefined

      const userRole: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
        role: "user",
        content: userImageUrl ? [userText, userImageUrl] : [userText],
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: temp,
        messages: systemRole ? [systemRole, userRole] : [userRole],
      })

      if (response.choices.length > 0) {
        const chatResponse = response.choices[0].message.content
        if (chatResponse) {
          return {
            requestId: response.id,
            text: chatResponse,
          }
        }
      }
    } catch (err: any) {
      console.warn("OpenAI fallback generation error:", err?.message || err)
    }
  }

  return undefined
}
