import { IconType } from "react-icons"

type Info = { icon?: IconType; badgeBackground: string; badgeText: string; shortSummary: string }

export default function Badge({ info }: { info: Info }) {
  const styles = { background: info.badgeBackground, color: info.badgeText }
  return (
    <div style={styles} className="text-sm me-2 px-2 py-0.5 rounded flex items-center gap-1">
      {info.icon && <info.icon />} {info.shortSummary}
    </div>
  )
}
