import { RequestState } from "@prisma/client"
import { NextRequest } from "next/server"
import { response } from "../util"
import { getMediaVerdicts } from "./actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const queryIds: string | null = req.nextUrl.searchParams.get("ids")
  if (!queryIds) return response.make(500, { state: RequestState.ERROR, errors: ["missing ids parameter"] })

  const mediaIds = queryIds.split(",").map((v) => v.trim())

  const body = getMediaVerdicts(mediaIds)

  if (Object.keys(body).length === 0) {
    return response.make(404, "no media items with the provided IDs found")
  }

  return response.make(200, body)
}
