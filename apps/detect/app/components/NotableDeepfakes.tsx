import { Button } from "flowbite-react"
import Link from "next/link"
import NotableMediaCard from "../media/notable/NotableMediaCard"
import { getNotableMedia } from "../internal/media/notable/actions"

// The regular "dark" theme changes the background of the button to the same color as the button
// when someone hovers over the button. Make a local theme so the button remains distinguishable.
const darkOnDarkTheme = { color: { dark: "bg-gray-800 hover:bg-gray-600 hover:text-gray-100" } }

export default async function NotableDeepfakes({ count }: { count: number }) {
  const { media } = await getNotableMedia(0, count)
  return (
    <>
      <div className="flex flex-row flex-wrap gap-5 items-start justify-center">
        {media.map((media: any) => (
          <NotableMediaCard key={media.mediaId} media={media} />
        ))}
      </div>
      <div className="items-center">
        <Link href={"/media/notable"}>
          <Button className="w-full mt-4 text-gray-400" theme={darkOnDarkTheme} color="dark">
            See more examples
          </Button>
        </Link>
      </div>
    </>
  )
}
