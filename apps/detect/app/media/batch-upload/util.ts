import { Role } from "../../auth"

export function roleAllowedToBatchUpload({ role }: { role: Role }): boolean {
  if (role.internal) return true
  return false
}
