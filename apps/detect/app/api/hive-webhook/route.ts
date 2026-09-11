import { RequestState } from "@prisma/client"
import { db } from "../../server"
import { response } from "../util"
import { pruneToHighestScoringOutput } from "../../model-processors/hive-util"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const reqJson = await req.json()
  const requestId: string | undefined = reqJson.id
  if (!requestId) {
    console.log("Hive webhook received invalid JSON:", reqJson)
    return response.make(400, { error: "Missing 'id' in JSON body" })
  }

  const newJson = pruneToHighestScoringOutput(reqJson)

  // update our analysis_results table with the fetched JSON
  const updateRsp = await db.analysisResult.updateMany({
    where: { requestId },
    data: {
      requestState: RequestState.COMPLETE,
      json: JSON.stringify(newJson),
      completed: new Date(),
    },
  })
  if (updateRsp.count === 0) {
    console.log(`Failed to find/update Hive analyis result [reqId=${requestId}]`)
    return response.make(500, { error: `Unknown task id` })
  }

  console.log(`Got Hive webook [reqId=${requestId}]`)
  return response.make(200, { status: "SUCCESS" })
}
