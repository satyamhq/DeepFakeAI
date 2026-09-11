"use server"

import React from "react"
import { Media } from "@prisma/client"
import { Metadata } from "next"
import { mediaVerdict } from "../data/verdict"
import { db } from "../server"
import { currentSiteBaseUrl, signUpUrl } from "../site"
import { metadata } from "../layout"
import Quiz from "./Quiz"
import TrueMediaLogo from "../components/TrueMediaLogo"
import Link from "next/link"

const title = "TrueMedia.org - Political Deepfake Quiz"
const description = "Can you detect a deepfake? Take the TrueMedia.org political deepfake quiz now and find out."
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...metadata,
    title,
    description,
    openGraph: {
      ...metadata.openGraph,
      url: `${currentSiteBaseUrl}/quiz`,
      title,
      description,
      images: `/truemedia-quiz-open-graph.jpg`,
    },
  }
}

export type Question = {
  id: string
  media: Media
  isFake: boolean
  title: string
  description: React.ReactNode
}

const ExternalLink = ({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) => (
  <a href={href} className={className} rel="noopener noreferrer" target="_blank">
    {children}
  </a>
)

const DescriptionLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <ExternalLink href={href} className="underline">
    {children}
  </ExternalLink>
)

// prettier-ignore
const quizMedia = [
  { id: "pf8gnScszm1EmkrCb1EuIVX_tLg.jpg", title: "Xóchitl Gálvez, Mexican presidential candidate", description: (<>Xóchitl Gálvez waving Mexico’s flag, <DescriptionLink href="https://restofworld.org/2024/elections-ai-tracker/#/manipulated-mexico-flag">manipulated to be upside down</DescriptionLink></>) },
  { id: "lWhG0sWV537fcJL_orhbq41Y-OM.jpg", title: "U.S. President Joe Biden with a WWII veteran", description: (<>President Biden talking with a <DescriptionLink href="https://x.com/POTUS/status/1793390126086619204">WWII veteran</DescriptionLink></>) },
  { id: "R6VB3R9Lg13QIQqgpomXeIIEigU.jpg", title: "Former German Chancellor Angela Merkel", description: (<>Angela Merkel <DescriptionLink href="https://www.politico.eu/article/spot-deepfake-artificial-intelligence-tools-undermine-eyes-ears/">playing a video game</DescriptionLink></>) },
  { id: "M9WWnSoqjxceRPNK9M6b-u9HT00.mp4", title: "Former U.S. President Donald Trump at Manhattan Criminal Courthouse", description: "Donald Trump speaking at the courthouse ahead of his conviction" },
  { id: "XhKj2vIaqkMg8hn91JqTCiFN6VA.mp4", title: "Former U.K. Prime Minister Boris Johnson visits Kyiv", description: (<>Boris Johnson <DescriptionLink href="https://www.cnn.com/videos/world/2022/04/10/boris-johnson-kyiv-ukraine-volodymyr-zelensky-ndwknd-vpx.cnn">meeting</DescriptionLink> with Ukraine President Volodymyr Zelensky in Kyiv</>) },
  { id: "lCC0X6TanDIghg8OHSPLOt0Uafk.mp4", title: "Russian President Vladimir Putin", description: "Russian President Putin discussing negotiations for peace with Ukraine" },
  { id: "amGVbtble0pMsgvHKETZ3ZPES4s.mp4", title: "Actor Mark Hamill press briefing", description: (<>Mark Hamill giving a <DescriptionLink href="https://www.youtube.com/watch?v=QvlV8G-NxDk">White House press briefing</DescriptionLink></>) },
  { id: "PWfMimqFyAVS3lMocRqWBQYpPC8.mp4", title: "Kim Jong Un, supreme leader of North Korea", description: (<>Kim Jong Un <DescriptionLink href="https://act.represent.us/sign/deepfake-release">explaining</DescriptionLink> why democracy is at risk</>) },
  { id: "6jESKtyja_DQQHSHIM9ir-FPrxg.wav", title: "U.S. President Joe Biden calling voters", description: (<><DescriptionLink href="https://apnews.com/article/ai-robocall-biden-new-hampshire-primary-2024-f94aa2d7f835ccc3cc254a90cd481a99">a robocall</DescriptionLink> telling New Hampshire Democrats not to vote in the primary</>) },
  { id: "WrSkrmuau5CI7mS_311lQu9ecPM.mp3", title: "London Mayor Sadiq Kahn cancelling Armistice Day celebrations", description: (<>Mayor Sadiq Kahn <DescriptionLink href="https://www.standard.co.uk/news/london/sadiq-khan-ai-misinformation-armistice-day-deepfake-b1139021.html">cancelling Armistice Day celebrations</DescriptionLink> to make way for a pro-Palestinian march</>) },
]

const QuizNavigationBar = () => (
  <div className="flex items-center justify-between">
    <ExternalLink className="m-[20px]" href="https://www.truemedia.org/">
      <TrueMediaLogo />
    </ExternalLink>
    <div className="flex items-center space-x-5 ml-auto mr-6">
      <ExternalLink href="https://givebutter.com/yPpxLZ">
        <button className="w-28 text-sm md:text-base text-white border border-lime-500 focus:outline-none hover:font-bold disabled:hover:font-normal py-2 rounded-full">
          DONATE
        </button>
      </ExternalLink>
      <Link className="hidden md:block" href={signUpUrl}>
        <button className="w-40 text-sm md:text-base bg-lime-500 focus:outline-none text-black hover:font-bold disabled:hover:font-normal py-2 rounded-full">
          JOIN NOW
        </button>
      </Link>
    </div>
  </div>
)

export default async function Page() {
  const media = await db.media.findMany({
    where: { OR: quizMedia.map((item) => ({ id: item.id })) },
    include: { meta: true },
  })

  const questions = quizMedia.reduce<Question[]>((result, quizItem) => {
    const mediaItem = media.find((m) => m.id === quizItem.id)
    if (!mediaItem) return result

    const { experimentalVerdict: verdict } = mediaVerdict(mediaItem)

    result.push({
      ...quizItem,
      media: mediaItem,
      isFake: verdict === "high",
    })
    return result
  }, [])

  return (
    <div className="flex flex-col h-svh">
      <QuizNavigationBar />
      <Quiz questions={questions} />
    </div>
  )
}
