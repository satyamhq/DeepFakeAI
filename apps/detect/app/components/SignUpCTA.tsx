import { Button } from "flowbite-react"
import { signUpUrl } from "../site"
import Link from "next/link"

export default function SignUpCTA() {
  return (
    <div className="w-full bg-gray-800 p-10 mb-10 rounded-lg flex flex-col items-center shrink">
      <h2 className="mb-4 text-4xl tracking-tight font-extrabold leading-tight">Get the full experience</h2>
      <div className="mb-4 text-xl text-gray-400 font-light">
        Get a free account to upload audio, video and image files and save history.
      </div>
      <Link href={signUpUrl}>
        <Button type="submit">Create Free Account</Button>
      </Link>
    </div>
  )
}
