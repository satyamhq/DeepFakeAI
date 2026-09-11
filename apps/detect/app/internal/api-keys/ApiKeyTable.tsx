"use client"

import { Alert, Button, Table, ToggleSwitch } from "flowbite-react"
import { useState, useTransition } from "react"
import * as actions from "./actions"
import CopyTextButton from "../../components/CopyTextButton"
import { IoIosWarning } from "react-icons/io"
import { ApiKeyTableRowData } from "./apiKeyRows"

export default function ApiKeyTable(props: {
  rows: ApiKeyTableRowData[]
  showInternalAdmin: boolean
  showUserColumn?: boolean
}) {
  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>Organization</Table.HeadCell>
        {props.showUserColumn && <Table.HeadCell>User</Table.HeadCell>}

        {props.showInternalAdmin && <Table.HeadCell>Created On</Table.HeadCell>}
        <Table.HeadCell>Key</Table.HeadCell>
        {props.showInternalAdmin && <Table.HeadCell>Usage</Table.HeadCell>}
      </Table.Head>
      <Table.Body className="bg-slate-800">
        {props.rows.map((row, idx) => {
          return (
            <ApiKeyTableRow
              key={idx}
              row={row}
              showUserColumn={props.showUserColumn}
              showInternalAdmin={props.showInternalAdmin}
            />
          )
        })}
      </Table.Body>
    </Table>
  )
}

function ApiKeyTableRow(props: { row: ApiKeyTableRowData; showInternalAdmin: boolean; showUserColumn?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [row, setRow] = useState(props.row)

  if (row.apiKey == null && row.organization == null) {
    return null
  }

  function setEnabled(enabled: boolean) {
    startTransition(async () => {
      if (row.apiKey == null) return
      const response = await actions.setApiKeyEnabled(row.apiKey.id, enabled)
      switch (response.type) {
        case "error":
          alert(response.message)
          return
        case "updated":
          setRow({ ...row, apiKey: response.updatedApiKey })
          break
      }
    })
  }

  const createApiKey = () => {
    startTransition(async () => {
      if (row.apiKey) return
      if (!row.clerkUser?.externalId) return
      const response = await actions.createApiKeyRecord({
        userId: row.clerkUser.externalId,
        orgId: row.organization?.id ?? null,
      })
      switch (response.type) {
        case "error":
          alert(response.message)
          return
        case "created":
          setRow({ ...row, apiKey: response.newApiKey })
          break
      }
    })
  }

  return (
    <Table.Row className="border-b border-gray-500 last:border-b-0">
      <Table.Cell className="align-baseline">
        {row.organization ? row.organization.name : <em className="text-gray-500">none</em>}
      </Table.Cell>
      {props.showUserColumn && (
        <Table.Cell className="align-baseline">
          {row.clerkUser ? `${row.clerkUser.fullName} ${row.clerkUser.email}` : <em className="text-gray-500">none</em>}
        </Table.Cell>
      )}
      {props.showInternalAdmin && (
        <Table.Cell className="align-baseline">
          {row.apiKey?.createdAt && new Date(row.apiKey.createdAt).toLocaleString()}
        </Table.Cell>
      )}
      <Table.Cell className="align-baseline">
        {row.apiKey ? (
          <div className="flex flex-row">
            <HiddenText text={row.apiKey.key} className="flex-nowrap" />

            {row.apiKey &&
              props.showInternalAdmin &&
              (row.apiKey.orgId == null || row.orgMemberActive || row.apiKey.enabled) && (
                <>
                  <ToggleSwitch
                    className="ml-8"
                    disabled={isPending}
                    checked={row.apiKey.enabled}
                    onChange={() => row.apiKey && setEnabled(!row.apiKey.enabled)}
                    label={row.apiKey.enabled ? "Enabled" : "Disabled"}
                    title={row.apiKey.enabled ? "Click to Disable" : "Click to Enable"}
                    theme={{
                      root: {
                        label:
                          "ms-3 mt-0.5 text-start text-sm font-medium text-gray-900 dark:text-gray-300 rounded-full px-2 py-0.5" +
                          (row.apiKey.enabled
                            ? " bg-green-100 text-green-800 group-hover:bg-green-200 dark:bg-green-200 dark:text-green-900 dark:group-hover:bg-green-300"
                            : " bg-red-100 text-red-800 group-hover:bg-red-200 dark:bg-red-200 dark:text-red-900 dark:group-hover:bg-red-300"),
                      },
                    }}
                  />
                </>
              )}
          </div>
        ) : (
          <Button size="sm" disabled={isPending} color="blue" onClick={createApiKey}>
            Create Api Key
          </Button>
        )}
        {row.apiKey?.orgId && !row.orgMemberActive && (
          <Alert color="warning" icon={IoIosWarning} className="mt-2">
            User is no longer a member of this organization.{" "}
            <p>
              {row.apiKey.enabled
                ? "API Key won't work even though it is enabled."
                : "They need to be added back before the API Key can be re-enabled."}
            </p>
          </Alert>
        )}
      </Table.Cell>
      {props.showInternalAdmin && (
        <Table.Cell className="align-baseline">
          {row.apiKey && row.apiKey._count && (
            <div className="flex flex-col text-nowrap">
              <div>{row.apiKey._count.queries} queries</div>
              <div>{row.apiKey._count.media} media resolutions</div>
              <div>{row.apiKey._count.analysisResults} analysis results</div>
            </div>
          )}
        </Table.Cell>
      )}
    </Table.Row>
  )
}

export function HiddenText({
  text,
  startShowing = false,
  className,
}: {
  className?: string
  text: string
  startShowing?: boolean
}) {
  const [show, setShow] = useState(startShowing)
  const hiddenText = "•".repeat(text.length)
  return (
    <div className={`flex gap-2 items-center flex-wrap ${className ?? ""}`}>
      <code className="break-all">{show ? text : hiddenText}</code>
      <CopyTextButton text={text} />
      <button onClick={() => setShow((p) => !p)}>{show ? "hide" : "show"}</button>
    </div>
  )
}
