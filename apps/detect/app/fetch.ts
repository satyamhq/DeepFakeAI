// use vague types here so that we can operate on the built-in Response/Headers and node-fetch
// Response/Headers because we have to use node-fetch in one place to support streaming data from a
// download directly to an upload (to avoid holding the whole file in memory)
type Headersish = {
  get: (name: string) => string | null
}

type Responsish = {
  status: number
  headers: Headersish
  json: () => Promise<any>
  text: () => Promise<string>
}

export const isJSON = (rsp: Responsish) => rsp.headers.get("Content-Type")?.includes("application/json")

const defaultMkError = <T>(message: string): T => ({ error: message }) as T
export type MkError<T> = (message: string) => T

// some API partners return JSON but with a text/plain content type, so if it looks like a JSON
// response, try parsing it as one
function adaptError<T>(message: string, mkError: MkError<T>): T {
  if (message.startsWith("{")) {
    try {
      return JSON.parse(message)
    } catch (error) {
      // fall through and return a wrapped response
    }
  }
  return mkError(message)
}

/** Extracts a JSON response from a `fetch` `Response`.
 * @param rsp the `Response` returned by a `fetch` call.
 * @param mkError optional adapter which is used if the request returns a non-JSON response. The
 * text of the response is supplied to the adapter which can return an object in the proper error
 * format.
 * @return an array containing `[HTTP status code, JSON]`.
 */
export async function getJson<T extends object>(
  rsp: Responsish,
  mkError: MkError<T> = defaultMkError,
): Promise<[number, T]> {
  const text = await rsp.text()
  return [rsp.status, isJSON(rsp) && text != "" ? JSON.parse(text) : adaptError(text, mkError)]
}

/** Fetches a URL which is expected to return a JSON response.
 * @param req the URL or a `Request` object.
 * @param init optional metadata configuring the request.
 * @param mkError optional adapter which is used if the request returns a non-JSON response. The
 * text of the response is supplied to the adapter which can return an object in the proper error
 * format.
 * @return an array containing `[HTTP status code, JSON]`.
 */
export async function fetchJson<T extends object>(
  req: RequestInfo | URL,
  init?: RequestInit,
  mkError: MkError<T> = defaultMkError,
): Promise<[number, T]> {
  const nocache: RequestInit = { cache: "no-store" } // tell Vercel to please not cache our requests
  const opts = init ? { ...init, ...nocache } : nocache
  return await getJson<T>(await fetch(req, opts), mkError)
}
