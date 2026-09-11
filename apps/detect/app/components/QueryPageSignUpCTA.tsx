import { Button, Card } from "flowbite-react"
import JumbotronImage from "./cta-gif-kamala-trump-256-simple.gif"
import { ArrowRightIcon, FlowbiteArrowUpRightFromSquare } from "./icons"
import { signUpUrl } from "../site"

export default function QueryPageSignUpCTA() {
  return (
    <Card
      className="md:flex-row-reverse md:max-w-none md:w-full items-center"
      imgSrc={JumbotronImage.src}
      horizontal
      theme={{
        root: { children: "flex h-full flex-col justify-center gap-4 p-6 w-full items-center" },
        img: {
          horizontal: {
            on: "h-96 w-full rounded-t-lg object-cover md:h-96 md:w-2/5 md:rounded-none md:rounded-l-lg",
          },
        },
      }}
    >
      <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Create an Account</h2>
      <p className="font-normal text-gray-700 dark:text-gray-400">
        Get a free account to upload audio, video and image files and save history.
      </p>
      <div className="flex gap-4 flex-col md:flex-row">
        <Button href={signUpUrl} className="w-48">
          Create an Account
          <ArrowRightIcon />
        </Button>
        <Button className="w-48" href="https://www.truemedia.org/how-it-works" target="_blank" outline>
          How it Works <FlowbiteArrowUpRightFromSquare />
        </Button>
      </div>
    </Card>
  )
}
