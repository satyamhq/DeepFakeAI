import Link from "next/link"

export default function Page() {
  return (
    <>
      <h1 className="font-bold text-xl">Internal Pages</h1>
      <ul>
        <li>
          <Link prefetch={false} href="internal/users">
            Users
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/queries">
            Queries
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/usage">
            Usage
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/media">
            Media
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/search">
            Search
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/media/notable">
            Notable
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/eval">
            Eval
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/reruns">
            Analysis Reruns
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/throttle">
            Analysis Throttles
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="internal/verified-sources">
            Verified Sources
          </Link>
        </li>
      </ul>
    </>
  )
}
