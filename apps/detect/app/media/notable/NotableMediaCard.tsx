import { NotableMedia } from "@prisma/client"
import { Button, Card } from "flowbite-react"
import { ArrowRightIcon, ImageIcon, MicrophoneIcon, QuestionMarkIcon, VideoCameraIcon } from "../../components/icons"
import {
  FaFacebook,
  FaGoogleDrive,
  FaInstagram,
  FaLink,
  FaMastodon,
  FaReddit,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { ReactElement } from "react"
import Link from "next/link"

export const mediaTypeIcon: Record<string, JSX.Element> = {
  VIDEO: <VideoCameraIcon />,
  IMAGE: <ImageIcon />,
  AUDIO: <MicrophoneIcon />,
  UNKNOWN: <QuestionMarkIcon />,
}

const mediaSourceIcons: Record<string, ReactElement> = {
  UNKNOWN: <FaLink className="inline ml-1" />,
  OTHER: <FaLink className="inline ml-1" />,
  X: <FaXTwitter className="inline ml-1" />,
  TIKTOK: <FaTiktok className="inline ml-1" />,
  MASTODON: <FaMastodon className="inline ml-1" />,
  YOUTUBE: <FaYoutube className="inline ml-1" />,
  REDDIT: <FaReddit className="inline ml-1" />,
  GOOGLE_DRIVE: <FaGoogleDrive className="inline ml-1" />,
  INSTAGRAM: <FaInstagram className="inline ml-1" />,
  FACEBOOK: <FaFacebook className="inline ml-1" />,
}

export default function NotableMediaCard({ media }: { media: NotableMedia }) {
  return (
    <Card className="w-72">
      <div className="flex flex-col justify-between h-full">
        <div className="flex">
          <div className="flex-1 text-lg font-semibold">{media.title}</div>
          <div className="flex-initial justify-end ml-2">
            <span className="text-gray-400">{mediaTypeIcon[media.mediaType]}</span>
          </div>
        </div>

        <div className="relative">
          <img src={media.imagePreviewUrl} />
        </div>

        <p className="text-gray-300 mb-8">{media.description}</p>

        {media.appearedIn === "UNKNOWN" ? (
          <div className="flex justify-end">
            <Link prefetch={false} href={"/media/analysis?id=" + media.mediaId}>
              <Button color="gray" className="">
                More
                <span className="ml-2">
                  <ArrowRightIcon />
                </span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            <div className="text-gray-400">
              Appeared in
              <span className="text-gray-400">{mediaSourceIcons[media.appearedIn]}</span>
            </div>
            <div className="ml-1 justify-end">
              <Link prefetch={false} href={"/media/analysis?id=" + media.mediaId}>
                <Button color="gray" className="">
                  More
                  <span className="ml-2">
                    <ArrowRightIcon />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
