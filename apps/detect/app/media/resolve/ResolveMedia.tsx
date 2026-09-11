"use client"

import { useContext, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card } from "flowbite-react"
import { ResolveResponse } from "../../services/mediares"
import { fetchJson } from "../../fetch"
import { analyzeUrl } from "../../data/media"
import { DebugContext } from "../../components/DebugContext"
import LoadingDots from "../../components/LoadingDots"
import ResolvedMedia from "./ResolvedMedia"
import { maybeUpdateLocalStorageHistory } from "../anon-recent/local-history"
import { getRoleByUser } from "../../auth"
import { useUser } from "@clerk/nextjs"
import FailureUI from "./FailureUI"

function blameYouTube(reason: string, details: string | undefined | null) {
  return details && details.includes("Sign in to confirm you’re not a bot.")
    ? "YouTube is currently preventing third parties from downloading videos from their site. " +
        "Unfortunately we cannot automatically analyze YouTube videos at this time."
    : reason
}

export function startAnalysis(
  mediaId: string,
  mimeType: string,
  postUrl: string,
  isAnonymous: boolean,
  routerReplace: (url: string) => void,
) {
  maybeUpdateLocalStorageHistory(isAnonymous, mediaId, mimeType, postUrl)
  routerReplace(analyzeUrl(mediaId, postUrl))
}

export default function ResolveMedia({ postUrl, orgId }: { postUrl: string; orgId: string }) {
  const router = useRouter()
  const { debug } = useContext(DebugContext)
  const { user } = useUser()
  const role = getRoleByUser(user)

  const [isRateLimitModalVisible, setRateLimitModalVisible] = useState(false)
  let redirected = false

  const mediaState = useQuery({
    queryKey: ["resolve", postUrl],
    queryFn: async () => {
      const [code, rrsp] = await fetchJson<ResolveResponse>(
        "/api/resolve-media",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postUrl, orgId }),
        },
        (errmsg) => ({ result: "failure", reason: errmsg }),
      )
      // if we only have one choice, go straight to the analysis of that one choice; except if it's a video then we
      // can't redirect quite yet because we have to check whether the video is too big/long first
      if (rrsp.result !== "failure" && rrsp.media.length == 1 && !rrsp.media[0].mimeType.startsWith("video/")) {
        startAnalysis(rrsp.media[0].id, rrsp.media[0].mimeType, postUrl, role.isNotLoggedIn, router.replace)
        redirected = true
      }
      // if the request fails with a 429 for anonymous users, show the sign-up modal
      else if (role.isNotLoggedIn && rrsp.result === "failure" && code === 429) {
        setRateLimitModalVisible(true)
      }
      return rrsp
    },
  })

  if (mediaState.isPending) {
    return (
      <main className="grow flex items-center justify-center">
        <Card>
          <div className="sm:text-xl">Resolving media in:</div>
          <div>
            <b>{postUrl}</b>
          </div>
          <div className="text-center">
            <LoadingDots color="#FFF" />
          </div>
        </Card>
      </main>
    )
  } else if (mediaState.isError) {
    return (
      <FailureUI
        postUrl={postUrl}
        reason={`Network error: ${mediaState.error}`}
        isQueryLimitReached={isRateLimitModalVisible}
      />
    )
  }

  const rsp = mediaState.data
  if (rsp.result == "failure") {
    return (
      <FailureUI
        postUrl={postUrl}
        reason={blameYouTube(rsp.reason, rsp.details)}
        details={debug && rsp.details ? rsp.details : undefined}
        isQueryLimitReached={isRateLimitModalVisible}
      />
    )
  } else if (rsp.media.length == 0) {
    return (
      <FailureUI
        postUrl={postUrl}
        reason={"Unable to identify any media on that page."}
        isQueryLimitReached={isRateLimitModalVisible}
      />
    )
  } else if (redirected) {
    return <div>Proceeding with analysis...</div>
  } else {
    return <ResolvedMedia postUrl={postUrl} media={rsp.media} />
  }
}
