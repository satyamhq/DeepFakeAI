import { Prisma } from "@prisma/client"
import { db } from "../../db"
import { TAKE_DEFAULT } from "../ui"
import { YMD } from "../summarize"

function searchClause(q: string): Prisma.MediaWhereInput {
  if (!q) return {}
  return {
    OR: [
      { meta: { source: { contains: q, mode: "insensitive" } } },
      { meta: { handle: { contains: q, mode: "insensitive" } } },
      { meta: { keywords: { contains: q, mode: "insensitive" } } },
      { meta: { comments: { contains: q, mode: "insensitive" } } },
      { posts: { some: { postUrl: { contains: q, mode: "insensitive" } } } },
    ],
  }
}

// Use any type because I'm not sure how to define the proper type past Prisma.MediaWhereInput that includes a JOIN
// on the meta table too.
function typeClause(mediaType: string): any {
  if (!mediaType || mediaType === "any") return {}
  return { mimeType: { startsWith: mediaType } }
}

function truthClause(truth: string, fakeKey: string): any {
  if (!truth || truth === "any") return {}
  const lookup: Record<string, string> = { fake: "TRUE", real: "FALSE", unknown: "UNKNOWN" }
  if (truth === "fake" || truth === "real") return { meta: { [fakeKey]: lookup[truth] } }
  // If we want to see unknown real/fake media we should select anything marked as UNKNOWN, or missing meta entirely.
  return { OR: [{ meta: { is: null } }, { meta: { [fakeKey]: lookup[truth] } }] }
}

function feedbackClause(withFeedback: string): any {
  if (withFeedback === "on") return { feedback: { some: {} } }
  return {}
}

function reviewerClause(reviewer: string): any {
  if (!reviewer || reviewer === "any") return {}
  if (reviewer === "unreviewed") {
    return { AND: [{ meta: { fakeReviewer: "" } }, { meta: { audioFakeReviewer: "" } }] }
  }
  return { OR: [{ meta: { fakeReviewer: reviewer } }, { meta: { audioFakeReviewer: reviewer } }] }
}

function dateRangeClause(from?: YMD, to?: YMD) {
  if (!from && !to) return {}
  return {
    resolvedAt: {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined,
    },
  }
}

const include = { meta: true, posts: true, notability: true, feedback: true }
export type MediaJoinResult = Prisma.MediaGetPayload<{ include: typeof include }>

export type MediaSearchParams = {
  offset: string
  q: string
  type: string
  truth: string
  audiotruth: string
  fb: string
  take?: number
  reviewer?: string
  from?: YMD
  to?: YMD
}

export function searchParamsToString(searchParams: MediaSearchParams): string {
  const urlSearchParams = new URLSearchParams()
  if (searchParams.offset) urlSearchParams.append("offset", searchParams.offset)
  if (searchParams.q) urlSearchParams.append("q", searchParams.q)
  if (searchParams.type) urlSearchParams.append("type", searchParams.type)
  if (searchParams.truth) urlSearchParams.append("truth", searchParams.truth)
  if (searchParams.audiotruth) urlSearchParams.append("audiotruth", searchParams.audiotruth)
  if (searchParams.fb) urlSearchParams.append("fb", searchParams.fb)
  if (searchParams.reviewer) urlSearchParams.append("reviewer", searchParams.reviewer)
  if (searchParams.from) urlSearchParams.append("from", searchParams.from)
  if (searchParams.to) urlSearchParams.append("to", searchParams.to)
  return urlSearchParams.toString()
}

export function urlSearchParamsToSearchParams(urlSearchParams: URLSearchParams) {
  return {
    offset: urlSearchParams.get("offset") ?? "",
    take: TAKE_DEFAULT,
    q: urlSearchParams.get("q") ?? "",
    type: urlSearchParams.get("type") ?? "",
    truth: urlSearchParams.get("truth") ?? "",
    audiotruth: urlSearchParams.get("audiotruth") ?? "",
    fb: urlSearchParams.get("fb") ?? "",
    reviewer: urlSearchParams.get("reviewer") ?? "",
    from: urlSearchParams.get("from") ?? "",
    to: urlSearchParams.get("to") ?? "",
  }
}

export function searchParamsDeconstructed(searchParams: MediaSearchParams) {
  const skip = parseInt(searchParams.offset || "0")
  const take = searchParams.take || TAKE_DEFAULT
  const search = searchParams.q ?? ""
  const type = searchParams.type ?? "any"
  const truth = searchParams.truth ?? "any"
  const audiotruth = searchParams.audiotruth ?? "any"
  const fb = searchParams.fb ?? "off"
  const reviewer = searchParams.reviewer ?? "any"
  const from = searchParams.from
  const to = searchParams.to
  return { skip, take, search, type, truth, audiotruth, fb, reviewer, from, to }
}

export async function searchMedia(searchParams: MediaSearchParams) {
  const { skip, take, search, type, truth, audiotruth, fb, reviewer, from, to } =
    searchParamsDeconstructed(searchParams)
  const sc = searchClause(search)
  const typec = typeClause(type)
  const tc = truthClause(truth, "fake")
  const ac = truthClause(audiotruth, "audioFake")
  const fbc = feedbackClause(fb)
  const reviewerc = reviewerClause(reviewer)
  const datec = dateRangeClause(from, to)
  const where = { AND: [sc, typec, tc, ac, fbc, reviewerc, datec] }

  console.log(
    `searchMedia [skip=${skip}, take=${take}, search=${search}, type=${type}, truth=${truth}, audiotruth=${audiotruth}, fb=${fb}]`,
  )
  const total = await db.media.count({ where })
  const media = await db.media.findMany({ skip, take, orderBy: [{ resolvedAt: "desc" }], include, where })

  return { total, media }
}

export async function getAllReviewers() {
  const dupedReviewers = await db.mediaMetadata.findMany({
    distinct: ["fakeReviewer", "audioFakeReviewer"],
    select: { fakeReviewer: true, audioFakeReviewer: true },
  })
  const reviewers = new Set<string>()
  const addReviewer = (reviewer: string) => reviewer && reviewers.add(reviewer)
  dupedReviewers.forEach((reviewer) => {
    addReviewer(reviewer.fakeReviewer)
    addReviewer(reviewer.audioFakeReviewer)
  })
  return reviewers
}
