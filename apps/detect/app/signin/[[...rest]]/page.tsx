import { redirect } from "next/navigation"
import { getServerRole } from "../../server"
import SignInPage from "./SignInPage"

export default async function Page() {
  const role = await getServerRole()
  if (role.isLoggedIn) return redirect("/")

  return <SignInPage />
}
