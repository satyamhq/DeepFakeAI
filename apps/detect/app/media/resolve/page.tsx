import { redirect } from "next/navigation"
import { getServerRole, isAnonEnabled } from "../../server"
import ErrorBox from "../../components/ErrorBox"
import ResolveMedia from "./ResolveMedia"
import { signInUrl } from "../../site"
import { isPostUrlInAllowList } from "./util"
import FailureUI from "./FailureUI"

export const dynamic = "force-dynamic"

// increase timeout for this "page" to 5 minutes; because the trim action turns around and re-requests the page with
// special arguments, we need the page to have a long timeout to allow the trim action to have a long timeout
export const maxDuration = 300

export default async function Page({ searchParams }: { searchParams: { url: string; orgId: string } }) {
  const doRedirect = !isAnonEnabled()
  const role = await getServerRole()
  if (role.isNotLoggedIn && doRedirect) {
    redirect(signInUrl)
  }

  const postUrl = searchParams.url?.trim()
  const orgId = searchParams.orgId?.trim()
  if (!postUrl) {
    return <ErrorBox title="Invalid request" message="Missing post URL." />
  }

  if (role.isNotLoggedIn && !isPostUrlInAllowList(postUrl)) {
    const reason =
      "The URL you submitted is not part of our currently supported sites. Create an account to upload files to TrueMedia.org directly."
    return <FailureUI postUrl={postUrl} reason={reason} isQueryLimitReached={false} />
  }

  return <ResolveMedia postUrl={postUrl} orgId={orgId} />
}
