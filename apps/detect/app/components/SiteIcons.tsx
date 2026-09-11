import { MediaPublisher } from "@prisma/client"
import { IconType } from "react-icons"
import {
  FaXTwitter,
  // FaYoutube,
  FaTiktok,
  FaReddit,
  FaGoogleDrive,
  FaInstagram,
  FaFacebook,
} from "react-icons/fa6"
import { LinkIcon, TruthSocial } from "./icons"
import { useUser } from "@clerk/nextjs"
import { getRoleByUser } from "../auth"

const icons = [
  { label: "TikTok", icon: FaTiktok },
  { label: "X", icon: FaXTwitter },
  // { label: "YouTube", icon: FaYoutube },
  { label: "Reddit", icon: FaReddit },
  { label: "Google Drive", icon: FaGoogleDrive },
  { label: "Instagram", icon: FaInstagram },
  { label: "Facebook", icon: FaFacebook },
  { label: "Truth Social", icon: TruthSocial },
]

export function MediaPublisherIcon({ platform }: { platform: MediaPublisher }) {
  const icon = icons.find((icon) => icon.label.toLowerCase() === platform.toLowerCase())
  return icon ? <icon.icon /> : <LinkIcon />
}

function mkIcon(label: string, Icon: IconType) {
  return (
    <div key={label} className="flex flex-col text-center items-center">
      <span className="inline-flex items-center justify-center w-8 h-8 text-md font-semibold rounded-full text-slate-100 bg-brand-green-dark-500">
        <Icon />
      </span>
      <span className="text-xs mt-1 hidden md:inline">{label}</span>
    </div>
  )
}

export default function SiteIcons() {
  const { user } = useUser()
  const role = getRoleByUser(user)

  return (
    <div className="flex flex-row flex-wrap gap-4 md:gap-8 text-gray-200">
      {/* Hide the Google Drive icon unless the user is logged in */}
      {icons
        .filter(({ label }) => label !== "Google Drive" || role.isLoggedIn)
        .map(({ label, icon }) => mkIcon(label, icon))}
    </div>
  )
}
