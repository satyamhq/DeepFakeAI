import { redirect } from "next/navigation"
import { getServerRole } from "../server"
import AuthForm from "../components/auth/AuthForm"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const role = await getServerRole()
  if (role.isLoggedIn) {
    return redirect("/")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      <AuthForm initialMode="signin" />
    </main>
  )
}
