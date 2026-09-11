import { isAnonEnabled, isGroundTruthUpdateEmailsEnabled, isVerifiedLabelEnabled } from "../../server"

export default function Page() {
  return (
    <div>
      <div>ANON_QUERY={"" + isAnonEnabled()}</div>
      <div>GROUND_TRUTH_UPDATE_EMAILS_ENABLED={"" + isGroundTruthUpdateEmailsEnabled()}</div>
      <div>VERIFIED_LABEL_ENABLED={"" + isVerifiedLabelEnabled()}</div>
    </div>
  )
}
