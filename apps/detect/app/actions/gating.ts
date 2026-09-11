"use server"
import { GatingConfig, setGatingConfig, ActiveGateKey, activeGateKeys } from "../gating"
import { getServerRole } from "../server"

export async function updateGatingConfig(
  prevState: { gateKey: ActiveGateKey; gatingConfig: GatingConfig; message: string },
  formData: FormData,
) {
  const role = await getServerRole()
  if (!role.admin) {
    return {
      ...prevState,
      message: "You are not authorized to modify the scheduler gating config",
    }
  }
  const gateKey = activeGateKeys.parse(formData.get("gateKey"))
  const enabled = formData.get("enabled") === "on"
  const userIds = (formData.get("userIds") as string).split(",").map((id) => id.trim())
  const emails = (formData.get("emails") as string).split(",").map((email) => email.trim())
  const domains = (formData.get("emailDomains") as string).split(",").map((domain) => domain.trim())
  const roleLevel = formData.get("roleLevel") ? parseInt(formData.get("roleLevel") as string) : undefined
  const newConfig = { enabled, userIds, emails, domains, roleLevel }
  await setGatingConfig(gateKey, newConfig)
  return { message: `"${gateKey}" gate config updated`, gatingConfig: newConfig, gateKey }
}
