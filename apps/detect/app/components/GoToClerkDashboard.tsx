import { Button } from "flowbite-react"
import Link from "next/link"

export function GoToClerkUsersDashboard() {
  return (
    <Link
      href="https://dashboard.clerk.com/apps/app_2ihz7M44vA6G36ftDQnyzq9QCFm/instances/ins_2kO4GQoKd0IsJg4IdaCNL52w93M/users"
      target="_blank"
    >
      <Button className="inline" color="lime">
        Manage users in Clerk Dashboard
      </Button>
    </Link>
  )
}

export function GoToClerkOrganizationsDashboard() {
  return (
    <Link
      href="https://dashboard.clerk.com/apps/app_2ihz7M44vA6G36ftDQnyzq9QCFm/instances/ins_2kO4GQoKd0IsJg4IdaCNL52w93M/organizations"
      target="_blank"
    >
      <Button className="inline" color="lime">
        Manage organizations in Clerk Dashboard
      </Button>
    </Link>
  )
}
