import { requireEnv } from "./util"

export const emailFrom = "noreply@truemedia.org"
const postmarkToken = requireEnv("POSTMARK_TOKEN")

export async function sendEmail(recip: string, subject: string, html: string, text: string) {
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": postmarkToken,
    },
    body: JSON.stringify({
      MessageStream: "outbound",
      From: emailFrom,
      To: recip,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
    }),
  })
  if (!response.ok) {
    console.log(`Failed to send email [email=${recip}, subject=${subject}]`)
    console.log(await response.json())
    throw new Error("Failed to send email")
  }
  console.log(`Sent email [email=${recip}, subject=${subject}]`)
  console.log(await response.json())
}
