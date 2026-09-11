import { redirect } from "next/navigation"
import { allowedToBatchUpload } from "./actions"

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await allowedToBatchUpload())) redirect("/")
  return <div>{children}</div>
}
