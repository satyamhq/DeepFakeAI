import { Dispatch, SetStateAction } from "react"
import Link from "next/link"
import { Label, Radio } from "flowbite-react"
import { Trulean } from "@prisma/client"
import { formatPct } from "../data/model"
import { FILE_UPLOAD_PSEUDO_URL_BASE, parseFakeMediaUrl } from "../media/upload/util"

export const TAKE_DEFAULT = 20

export const tableHeader = (cols: string[]) => (
  <tr>
    {cols.map((col, ii) => (
      <th key={ii} className="border border-slate-600 p-2 text-slate-200 text-left">
        {col}
      </th>
    ))}
  </tr>
)

type Formatter<T> = (item: T) => JSX.Element

export const showText = (text: string) => <span>{text}</span>

export function tableCell<T>(idx: number, formatter: Formatter<T>, item: T) {
  return (
    <td key={idx} className="border border-slate-700 p-2 text-slate-400">
      {formatter(item)}
    </td>
  )
}

export function tableRow<T>(key: string, formatters: Formatter<T>[], item: T) {
  return <tr key={key}>{formatters.map((fmt, ii) => tableCell(ii, fmt, item))}</tr>
}

export function table<T>(items: T[], mkKey: (item: T) => string, headers: string[], formatters: Formatter<T>[]) {
  return (
    <table className="table-auto border border-collapse border-slate-500 bg-slate-800">
      <thead>{tableHeader(headers)}</thead>
      <tbody>{items.map((item) => tableRow(mkKey(item), formatters, item))}</tbody>
    </table>
  )
}

export type RadioItem<T> = {
  id: T
  label: string
  tooltip?: JSX.Element
}

export function radioRow<T>(items: RadioItem<T>[], selected: T, setSelected: Dispatch<SetStateAction<T>>) {
  return (
    <div className="flex flex-row gap-5">
      {items.map(({ id, label, tooltip }) => (
        <div key={`${id}`} className="flex items-center gap-2">
          <Radio
            id={`${id}`}
            checked={selected == id}
            onChange={(v) => {
              if (v) setSelected(id)
            }}
          />
          <Label>{label}</Label>
          {tooltip}
        </div>
      ))}
    </div>
  )
}

export const mkLink = (href: string, text: string, target?: string, className?: string) => (
  <Link prefetch={false} className={"underline text-ellipsis " + className} href={href} target={target}>
    {text}
  </Link>
)

export const truncate = (url: string, maxchars: number) =>
  url.length < maxchars ? url : url.substring(0, maxchars - 3) + "..."

export const PostLink = ({ postUrl, className }: { postUrl: string; className?: string }) =>
  postUrl.includes(FILE_UPLOAD_PSEUDO_URL_BASE) ? (
    <span className={"text-ellipsis " + className}>file://{parseFakeMediaUrl(postUrl)?.filename}</span>
  ) : (
    mkLink(postUrl, truncate(postUrl, 128), "_blank", className)
  )

export const analysisLink = (id: string, label: string, target?: string) =>
  mkLink(`/media/analysis?id=${id}`, label, target)

export function pageNav(page: string) {
  return (
    <h1 className="font-bold text-xl mb-5">
      <Link prefetch={false} href="/internal">
        Internal
      </Link>
      &nbsp;→&nbsp;{page}
    </h1>
  )
}

export function subPageNav(parentLabel: string, parentPath: string, page: string) {
  return (
    <h1 className="font-bold text-xl mb-5">
      <Link prefetch={false} href="/internal">
        Internal
      </Link>
      &nbsp;→&nbsp;
      <Link prefetch={false} href={`/internal/${parentPath}`}>
        {parentLabel}
      </Link>
      &nbsp;→&nbsp;{page}
    </h1>
  )
}

export function pageLinks(
  baseUrl: string,
  offset: number,
  count: number,
  loaded: number,
  total: number,
  extraArgs = "",
) {
  // If the URL already contains a URL param we should use & instead of ? when
  // we feed the URL our first param.
  const urlParamsDelimeter = baseUrl.includes("?") ? "&" : "?"

  const prevUrl = `${baseUrl}${urlParamsDelimeter}offset=${Math.max(offset - count, 0)}${extraArgs}`
  const nextUrl = `${baseUrl}${urlParamsDelimeter}offset=${offset + count}${extraArgs}`

  const prev =
    offset > 0 ? (
      <Link prefetch={false} href={prevUrl}>
        Prev
      </Link>
    ) : (
      <span className="text-slate-700">Prev</span>
    )
  const next =
    loaded >= count ? (
      <Link prefetch={false} href={nextUrl}>
        Next
      </Link>
    ) : (
      <span className="text-slate-700">Next</span>
    )
  const last = Math.min(offset + count, total)
  return (
    <div className="text-center">
      {prev}
      <span className="mx-5">&bull;</span>
      <span>
        {Math.min(offset + 1, last)}-{last} of {total}
      </span>
      <span className="mx-5">&bull;</span>
      {next}
    </div>
  )
}

export function pageLinksFromDateStream(baseUrl: string, mostRecent: Date) {
  // If the URL already contains a URL param we should use & instead of ? when
  // we feed the URL our first param.
  const urlParamsDelimeter = baseUrl.includes("?") ? "&" : "?"

  const nextUrl = `${baseUrl}${urlParamsDelimeter}t=${mostRecent.getTime()}`
  const next = (
    <Link prefetch={false} href={nextUrl}>
      More
    </Link>
  )
  return <div className="text-center mb-5">{next}</div>
}

// Metrics/Evaluation/Performance UI bits

export const colors = {
  fake: "text-purple-500",
  real: "text-cyan-500",
  unknown: "text-gray-500",
  good: "text-lime-500",
  bad: "text-red-500",
}

function formatDelta(score: number, compare: number, posGood: boolean = true) {
  const delta = score - compare
  const deltaPct = ` ${delta >= 0 ? "+" : ""}${formatPct(delta, 1)}`
  if (Math.abs(delta) < 0.0005) return <span className="text-sm"> 0%</span>
  return posGood == delta > 0 ? format.good(deltaPct, "text-sm") : format.bad(deltaPct, "text-sm")
}

export const format = {
  fake: (text: any) => <span className={colors.fake}>{text}</span>,
  real: (text: any) => <span className={colors.real}>{text}</span>,
  good: (text: any, extra: string = "") => <span className={`${colors.good} ${extra}`}>{text}</span>,
  bad: (text: any, extra: string = "") => <span className={`${colors.bad} ${extra}`}>{text}</span>,
  indet: (text: any) => <span className={colors.unknown}>{text}</span>,
  metric: (score: number, compare?: number, posGood?: boolean) => (
    <div>
      <span className={score >= 0.8 ? colors.good : colors.bad}>{formatPct(score)}</span>
      {compare === undefined ? undefined : formatDelta(score, compare, posGood)}
    </div>
  ),
  failMetric: (score: number) => (
    <div>
      <span className={score >= 0.2 ? colors.bad : colors.good}>{formatPct(score)}</span>
    </div>
  ),
}

export function colorize(fake: Trulean, count: any) {
  const color = fake === "TRUE" ? colors.fake : fake === "FALSE" ? colors.real : colors.unknown
  return <span className={color}>{count}</span>
}
