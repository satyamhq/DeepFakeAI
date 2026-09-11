import { Suspense } from "react"
import { getGatingConfig, ActiveGateKey } from "../../../gating"
import { GatingConfigEditor } from "./GatingConfigEditor"

async function GatingConfigView({ gateKey }: { gateKey: ActiveGateKey }) {
  const gatingConfig = await getGatingConfig(gateKey)
  return <GatingConfigEditor gatingConfig={gatingConfig} gateKey={gateKey} />
}

export default function GatingConfigEditorLoader({ gateKey }: { gateKey: ActiveGateKey }) {
  return (
    <Suspense fallback={<div>Loading gating configuration for {gateKey}...</div>}>
      <GatingConfigView gateKey={gateKey} />
    </Suspense>
  )
}
