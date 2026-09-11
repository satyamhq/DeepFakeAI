import OpenAI from "openai"
import { requireEnv, canParseUrl } from "../../util"

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
  const apiKey = requireEnv("OPENAI_API_KEY")
  const openai = new OpenAI({
    apiKey,
  })

  // Constrain the optional temperature to 0-2 per OpenAI docs
  if (!!temperature && temperature > 2) {
    temperature = 2
  } else if (!!temperature && temperature < 0) {
    temperature = 0
  }

  const systemRole: OpenAI.Chat.Completions.ChatCompletionMessageParam | undefined = systemMessage
    ? {
        role: "system",
        content: systemMessage,
      }
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
  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o",
    temperature,
    messages: systemRole ? [systemRole, userRole] : [userRole],
  }
  const response = await openai.chat.completions.create(body)

  if (response.choices.length > 0) {
    const chatResponse = response.choices[0].message.content
    if (chatResponse) {
      return {
        requestId: response.id,
        text: chatResponse,
      }
    }
  }

  return undefined
}
