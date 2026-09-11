import { isAnonEnabled } from "./server"
import { auth } from "@clerk/nextjs/server"
import QueryPage from "./QueryPage"
import { redirect } from "next/navigation"
import AnonymousUserHistory from "./media/anon-recent/AnonymousRecentSearches"
import QueryPageSignUpCTA from "./components/QueryPageSignUpCTA"
import OnboardingPage from "./OnboardingPage"
import { signInUrl } from "./site"
import { HomepageUserHistory } from "./media/history/HomepageUserHistory"
import CreateOrgCTA from "./components/create-org/CreateOrgCTA"

export const dynamic = "force-dynamic"

export default async function Page() {
  // redirect unauthed users to /signin if anonymous queries are not enabled
  const doRedirect = !isAnonEnabled()

  let isLoggedIn = false

  const session = auth()
  isLoggedIn = !!session.userId
  if (!isLoggedIn && doRedirect) {
    console.log(`redirecting to ${signInUrl}`)
    return redirect(signInUrl)
  }

  if (isLoggedIn && !session.sessionClaims?.agreedTerms) {
    console.log("user has not agreed to terms")
    return <OnboardingPage />
  }

  return (
    <QueryPage>
      {isLoggedIn && (
        <>
          <HomepageUserHistory />
          <CreateOrgCTA />
        </>
      )}
      {!isLoggedIn && (
        <>
          <AnonymousUserHistory />
          <QueryPageSignUpCTA />
        </>
      )}
    </QueryPage>
  )
}
