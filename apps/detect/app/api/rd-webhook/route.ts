import { RequestState } from "@prisma/client"
import { db } from "../../server"
import { fetchJson } from "../../fetch"
import { RDMediaInfo } from "../../model-processors/reality"
import { response, requireEnv } from "../util"
import { REALITY_BASE_URL } from "../starters/reality"

export const dynamic = "force-dynamic"

const apiKey = requireEnv("REALITY_API_KEY")

export async function POST(req: Request) {
  const reqJson = await req.json()
  const requestId: string = reqJson.requestId
  if (!requestId) {
    console.log("RD webhook received invalid JSON:", reqJson)
    return response.make(400, { error: "Missing 'requestId' in JSON body" })
  }

  // fetch the analysis results for the request that has been completed
  const [mediaCode, mediaJson] = await fetchJson(`${REALITY_BASE_URL}/media/users/${requestId}`, {
    method: "GET",
    headers: { "x-api-key": apiKey },
  })
  if (mediaCode != 200) {
    console.log("Media request failed:", mediaJson)
    return response.make(mediaCode, mediaJson)
  }

  const mediaData = mediaJson as RDMediaInfo
  if (mediaData.requestId != requestId) {
    console.warn(`Media data request id mismatch [hook=${requestId}, data=${mediaData.requestId}]`)
    console.warn(mediaData)
    return response.make(500, { error: `Media data request_id mismatch` })
  }

  // update our analsysis_results table with the fetched JSON
  const updateRsp = await db.analysisResult.updateMany({
    where: { requestId },
    data: {
      requestState: RequestState.COMPLETE,
      json: JSON.stringify(mediaData),
      completed: new Date(),
    },
  })
  if (updateRsp.count === 0) {
    console.log(`Failed to find/update analyis result [reqId=${requestId}, filename=${mediaData.filename}]`)
    console.log(reqJson)
    console.log(mediaData)
    return response.make(500, { error: `Unknown requestId` })
  }

  console.log(`Got RD webook [reqId=${requestId}, filename=${mediaData.filename}]`)
  return response.make(200, { status: "SUCCESS" })
}
