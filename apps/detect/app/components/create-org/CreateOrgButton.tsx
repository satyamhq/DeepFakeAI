"use client"

import { Button, ButtonProps, Modal, TextInput, Label } from "flowbite-react"
import { useState } from "react"
import { supabaseAdmin } from "../../db"

/**
 * A button that opens a modal to create an organization using Supabase.
 */
export default function CreateOrgButton(props: Omit<ButtonProps, "href" | "onClick">) {
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return

    setLoading(true)
    setError(null)
    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")
      const { error: insertError } = await supabaseAdmin.from("organizations").insert({
        name: orgName,
        slug,
      })
      if (insertError) {
        throw new Error(insertError.message)
      }
      setSuccess(true)
      setTimeout(() => {
        setShowCreateOrg(false)
        setSuccess(false)
        setOrgName("")
      }, 1200)
    } catch (err: any) {
      setError(err?.message || "Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button {...props} onClick={() => setShowCreateOrg(true)}>
        {props.children || "Create Organization"}
      </Button>
      <Modal
        show={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        dismissible
        popup
        size="md"
      >
        <Modal.Header />
        <Modal.Body>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              Create Organization
            </h3>
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800">
                Organization created successfully!
              </div>
            )}
            <div>
              <div className="mb-2 block">
                <Label htmlFor="orgName" value="Organization Name" />
              </div>
              <TextInput
                id="orgName"
                placeholder="Acme Deepfake Detection Lab"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button color="gray" onClick={() => setShowCreateOrg(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !orgName.trim()}>
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </>
  )
}
