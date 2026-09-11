import { redirect } from "next/navigation"
import AttributeUserQueriesToOrgForm from "./AttributeUserQueriesToOrgForm"
import attributeUserQueriesToOrg from "../../api/org-member-created/actions"
import { getServerRole } from "../../server"

export default async function Page() {
  const role = await getServerRole()
  if (!role.admin) return redirect("/")
  return (
    <div>
      <h1 className="font-bold text-xl">Trigger org-member-created Webhook</h1>
      <AttributeUserQueriesToOrgForm triggerWebhook={attributeUserQueriesToOrg} />
    </div>
  )
}
