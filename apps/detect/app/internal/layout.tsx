import { redirect } from "next/navigation"
import { getServerRole } from "../server"
import Navigation from "../components/navigation/Navigation"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const role = await getServerRole()

  if (!role.friend) redirect("/")
  return (
    <Navigation>
      <main className="grow flex flex-col justify-start p-4 md:p-6">{children}</main>
    </Navigation>
  )
}
