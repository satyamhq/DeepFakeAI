import { getServerRole } from "../../server"
import { getNotableMedia } from "../../internal/media/notable/actions"
import NotableMediaCard from "./NotableMediaCard"
import SignUpCTA from "../../components/SignUpCTA"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { offset: string } }) {
  const skip = parseInt(searchParams.offset || "0")
  const take = 10
  const { media } = await getNotableMedia(skip, take)
  const role = await getServerRole()

  return (
    <>
      {role.isNotLoggedIn && <SignUpCTA />}

      <h1 className="text-4xl font-bold">Notable Deepfakes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {media.map((mediaItem) => (
          <NotableMediaCard key={mediaItem.media.id} media={mediaItem} />
        ))}
      </div>
    </>
  )
}
