"use client"
import type { GatingConfig, ActiveGateKey } from "../../../gating"
import { Alert, Button, Checkbox, Label, Select, TextInput } from "flowbite-react"
import { userRoles } from "../../../auth"
import { updateGatingConfig } from "../../../actions/gating"
import { useFormState } from "react-dom"

export function GatingConfigEditor({ gatingConfig, gateKey }: { gatingConfig: GatingConfig; gateKey: ActiveGateKey }) {
  const [state, formAction] = useFormState(updateGatingConfig, {
    gateKey,
    gatingConfig,
    message: "",
  })
  return (
    <form className="flex flex-col gap-2" action={formAction}>
      <input type="hidden" name="gateKey" value={gateKey} />
      {state.message && <Alert color="info">{state.message}</Alert>}
      <div className="flex items-center gap-2">
        <Checkbox name="enabled" value="on" defaultChecked={state.gatingConfig.enabled} />
        <Label>Enabled</Label>
      </div>
      <div>
        <div className="mb-2 block">
          <Label>Enabled User Ids</Label>
        </div>
        <TextInput
          name="userIds"
          defaultValue={state.gatingConfig.userIds.join(", ")}
          helperText="You can enter a comma separated list"
        />
      </div>
      <div>
        <div className="mb-2 block">
          <Label>Enabled User Emails</Label>
        </div>
        <TextInput
          name="emails"
          defaultValue={state.gatingConfig.emails.join(", ")}
          helperText="You can enter a comma separated list"
        />
      </div>
      <div>
        <div className="mb-2 block">
          <Label>Enabled User Email Domains</Label>
        </div>
        <TextInput
          name="emailDomains"
          defaultValue={state.gatingConfig.domains.join(", ")}
          helperText="You can enter a comma separated list"
        />
      </div>
      <div>
        <div className="mb-2 block">
          <Label>Role Level</Label>
        </div>
        <Select name="roleLevel" defaultValue={state.gatingConfig.roleLevel?.toString()}>
          <option value={""}>Not Set</option>
          {[userRoles.admin, userRoles.internal, userRoles.friend, userRoles.user, userRoles.anonymous].map((role) => (
            <option key={role.level} value={role.level.toString()}>
              {role.name} - {role.level}
            </option>
          ))}
        </Select>
      </div>
      <div className="self-end">
        <Button type="submit">Update &quot;{gateKey}&quot; Gate</Button>
      </div>
    </form>
  )
}
