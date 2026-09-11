import { redirect } from "next/navigation"
import { getServerRole } from "../../server"
import SignUpPage from "./SignUpPage"

export default async function Page() {
  const role = await getServerRole()
  if (role.isLoggedIn) return redirect("/")

  return <SignUpPage />
}
