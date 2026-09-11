import { WebClient } from "@slack/web-api"

const token = process.env.SLACK_TOKEN
const web = new WebClient(token)

// To find the ID of a channel:
// Go to Slack
// Right click on the channel
// Click Copy
// Click Copy link
// Take the last part of the URL
// OPEN-TODO: Fill in your own Slack channel IDs
export const CHANNEL_ENG_ALERTS_THROTTLE = "PLACEHOLDER-SLACK-ID"
export const CHANNEL_ENG_WARNINGS = "PLACEHOLDER-SLACK-ID"
export const CHANNEL_TRENDING_QUERIES_ALERTS = "PLACEHOLDER-SLACK-ID"
export const CHANNEL_SLACK_BOT_DUMP = "PLACEHOLDER-SLACK-ID"
export const CHANNEL_SLACK_BATCH_NOTIFY = "PLACEHOLDER-SLACK-ID"

export async function postMessage(channel: string, text: string) {
  console.log("Slack postMessage", text)
  return await web.chat.postMessage({ text, channel })
}
