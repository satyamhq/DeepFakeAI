import DateLabel from "../../../components/DateLabel"
import { table, pageLinks, mkLink, subPageNav, TAKE_DEFAULT } from "../../ui"
import { getNotableMedia } from "./actions"
import AddNotableMedia from "./AddNotableMedia"

export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: { offset: string } }) {
  const skip = parseInt(searchParams.offset || "0")
  const take = TAKE_DEFAULT
  const { media, total } = await getNotableMedia(skip, take)

  return (
    <div className="flex flex-col w-full">
      {subPageNav("Media", "media", "Notable")}

      <AddNotableMedia />

      {pageLinks("/internal/media", skip, take, media.length, total)}
      {table(
        media,
        (mm) => mm.mediaId,
        ["Score", "Notability", "Title", "Description", "Media", "Created At", "Edit"],
        [
          (mm) => <span>{mm.score}</span>,
          (mm) => <span>{mm.notability}</span>,
          (mm) => <span>{mm.title ?? ""}</span>,
          (mm) => <span>{mm.description ?? ""}</span>,
          (mm) => mkLink(`/media/analysis?id=${mm.mediaId}`, mm.mediaId),
          (mm) => <DateLabel date={mm.created} />,
          (mm) => mkLink(`/internal/media/notable/edit?id=${mm.mediaId}`, "Edit"),
        ],
      )}
    </div>
  )
}
