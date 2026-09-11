import QueryPage from "./QueryPage"
import AnonymousUserHistory from "./media/anon-recent/AnonymousRecentSearches"
import QueryPageSignUpCTA from "./components/QueryPageSignUpCTA"

export const dynamic = "force-dynamic"

export default async function Page() {
  return (
    <QueryPage>
      <AnonymousUserHistory />
      <QueryPageSignUpCTA />
    </QueryPage>
  )
}
