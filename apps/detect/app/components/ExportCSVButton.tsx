import { Button, Tooltip } from "flowbite-react"
import { IoCloudDownloadOutline } from "react-icons/io5"
import { MediaSearchParams, searchParamsToString } from "../internal/media/search"

export const ExportCSVButton = ({ href }: { href: string }) => {
  return (
    <Button color="blue">
      <a className="flex gap-2 items-center" target="_blank" rel="noreferrer" href={href}>
        <IoCloudDownloadOutline />
        Export CSV
      </a>
    </Button>
  )
}

export const MediaExportCSVButton = ({ searchParams }: { searchParams: MediaSearchParams }) => {
  if (!searchParams.type || searchParams.type === "any") {
    return (
      <Tooltip placement="bottom" content="Choose only 1 media type and press Search to enable CSV export.">
        <Button disabled color="blue">
          <span className="flex gap-2 items-center">
            <IoCloudDownloadOutline />
            Export CSV
          </span>
        </Button>
      </Tooltip>
    )
  }
  const href = `/internal/media/export?${searchParamsToString(searchParams)}`
  return <ExportCSVButton href={href} />
}

type UserHistoryExportProps = {
  filter: string
  query: string
  timeStart?: Date
  timeEnd?: Date
  userId: string | null
  orgId: string | null
  allOrg: boolean
  isImpersonating: boolean
}

export const UserHistoryExportButton = ({
  filter,
  query,
  timeStart,
  timeEnd,
  userId,
  orgId,
  allOrg,
  isImpersonating,
}: UserHistoryExportProps) => {
  const f = encodeURIComponent(filter)
  const q = encodeURIComponent(query)
  const t0 = encodeURIComponent(timeStart?.getTime() || "")
  const tf = encodeURIComponent(timeEnd?.getTime() || "")
  const encodedUserId = encodeURIComponent(userId ?? "")
  const encodedOrgId = encodeURIComponent(orgId ?? "")
  const href = `/api/history-export?f=${f}&q=${q}&t0=${t0}&tf=${tf}&userId=${encodedUserId}&orgId=${encodedOrgId}&allOrg=${allOrg}&isImpersonating=${isImpersonating}`
  return <ExportCSVButton href={href} />
}
