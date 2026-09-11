"use client"
import { Alert, Button, Label, Textarea } from "flowbite-react"
import type { SchedulerConfigData } from "@truemedia/scheduler/schemas"
import { updateSchedulerConfig } from "./actions"
import { useState, useTransition } from "react"

export function SchedulerConfigEditor({ schedulerConfig }: { schedulerConfig: SchedulerConfigData }) {
  const [configText, setConfigText] = useState(JSON.stringify(schedulerConfig, null, 2))
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  let validJson: any = null
  try {
    validJson = JSON.parse(configText)
  } catch (e) {
    // pass
  }
  return (
    <div className="flex flex-col gap-2">
      {message && <Alert color="info">{message}</Alert>}
      <Label>Raw JSON Config</Label>
      <Textarea
        style={{ fontFamily: "monospace" }}
        onChange={(e) => setConfigText(e.target.value)}
        rows={20}
        value={configText}
        helperText="Don't worry, the json is validated before configuration is updated."
      />
      <Button
        className="self-end"
        disabled={!validJson || isPending}
        onClick={() => {
          if (!validJson) return
          startTransition(async () => {
            const result = await updateSchedulerConfig(validJson)
            setMessage(result.message)
            if (result.updated) {
              setConfigText(JSON.stringify(result.updated, null, 2))
            }
          })
        }}
      >
        Update Config
      </Button>
    </div>
  )
}
