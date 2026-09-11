import { RequestState } from "@prisma/client"

/** Creates our various API response types. */
export const response = {
  /** Create an `application/json` response from the supplied `body`. If `body` is a string, it will
   * be used as-is, assuming it is already formatted JSON. Otherwise it will be converted to JSON
   * via JSON.stringify.
   */
  make: (status: number, body: any) =>
    new Response(typeof body == "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),

  /** Makes an `ERROR` response for one of our `get-result` backends. */
  error: (status: number, error: string, detail: any | undefined = undefined) =>
    response.make(status, { state: RequestState.ERROR, error, detail }),
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) console.warn(`Missing required env var '${name}'!`)
  return value ?? ""
}

// used by rate.ts but defined here so that we can unit test without pulling in the database code
export function checkRate(now: number, times: number[], requests: number, duration: number): number[] | undefined {
  // determine the time since the "oldest" request; if we've made fewer than `request` requests, then the oldest can be
  // considered to be infinite seconds ago, but we'll just use one second longer than the min duration
  const oldest = times.length >= requests ? now - times[requests - 1] : duration + 1
  if (oldest < duration) return undefined
  times.unshift(now)
  return times.slice(0, requests)
}

// TODO: URL.canParse() should be a thing, but the build doesn't agree. Figure that out.
export function canParseUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const mimeTypeToExt = {
  "audio/aac": ".aac",
  "audio/basic": ".snd",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/webm": ".opus",
  "audio/x-aiff": ".aiff",
  "audio/x-wav": ".wav",
  "audio/wav": ".wav",
}

/** Fixes the file suffix of `filename` based on `contentType`.
 *
 * Some of our audio media have IDs that end with .dat because during the process of downloading that media, we were
 * unable to determine the media's content-type. But some providers freak out if audio files are named .dat, so we
 * have to work around this by looking at the content-type of the media at the time that we upload it to the provider.
 */
export function fixAudioFileName(filename: string, contentType: string | null): string {
  if (!filename.endsWith(".dat")) return filename // already good!

  // if we have no content type, or don't know the extension for this content-type then lie and say it's a .wav
  const fileext = (contentType && mimeTypeToExt[contentType as keyof typeof mimeTypeToExt]) || ".wav"

  // console.log(`Adjusting file extension based on content-type ` +
  //             `[file=${filename}, contentType=${contentType}, newext=${fileext}]`)
  return filename.substring(0, filename.length - 4) + fileext
}
