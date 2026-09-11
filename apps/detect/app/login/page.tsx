import { redirect } from "next/navigation"
import { signInUrl } from "../site"

export default function Page() {
  redirect(signInUrl)
}
