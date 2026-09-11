import { clerkOrgCreatedWebhookSecret, isAnonEnabled, isGroundTruthUpdateEmailsEnabled } from "../../server"

export default function Page() {
  return (
    <div>
      <div>ANON_QUERY={"" + isAnonEnabled()}</div>
      <div>CLERK_ORG_CREATED_WEBHOOK_SECRET={"" + clerkOrgCreatedWebhookSecret()}</div>
      <div>GROUND_TRUTH_UPDATE_EMAILS_ENABLED={"" + isGroundTruthUpdateEmailsEnabled()}</div>
    </div>
  )
}
