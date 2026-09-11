import { subPageNav } from "../../ui"
import AddVerifiedSourceForm from "./AddVerifiedSourceForm"

export default async function Page() {
  return (
    <>
      {subPageNav("Verified Sources", "verified-sources", "Manage")}
      <div>
        <div className="font-bold text-xl mb-2">Add Verified Source</div>
        <AddVerifiedSourceForm />
      </div>
    </>
  )
}
