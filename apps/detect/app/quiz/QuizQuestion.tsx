import React, { useRef, useEffect } from "react"
import { HiX, HiOutlineExclamationCircle } from "react-icons/hi"
import { IoCheckmarkOutline } from "react-icons/io5"
import { FaAngleRight } from "react-icons/fa6"
import Link from "next/link"
import { useSwiper } from "swiper/react"
import { Media } from "@prisma/client"
import { MediaHandle } from "../components/ShowMedia"
import MediaView from "../components/MediaView"
import { Question } from "./page"
import { FakeBadge, RealBadge } from "./QuizMediaLabels"

export function mediaString(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio clip"
  return "unknown"
}

function MediaExample({ media, isFake, isActive }: { media: Media; isFake?: boolean; isActive: boolean }) {
  const mediaRef = useRef<MediaHandle>(null)
  const type = mediaString(media.mimeType)

  useEffect(() => {
    if (mediaRef && mediaRef.current && !isActive) {
      mediaRef.current.pause()
    }
  }, [isActive])

  return (
    <div className="relative flex flex-col w-full lg:w-auto h-auto lg:h-full min-h-0 min-w-0 aspect-square rounded-lg">
      <MediaView media={media} mediaRef={mediaRef} backgroundColor="bg-brand-green-500" />
      <div className="absolute left-2 bottom-2">
        {isFake === true ? (
          <FakeBadge mediaString={type} />
        ) : isFake === false ? (
          <RealBadge mediaString={type} />
        ) : null}
      </div>
    </div>
  )
}

export default function QuizQuestion({
  isActive,
  question,
  answer,
  onAnswer,
}: {
  isActive: boolean
  question: Question
  answer: boolean | undefined
  onAnswer: (answer: boolean) => void
}) {
  const swiper = useSwiper()

  const isAnswered = answer !== undefined
  const isCorrect = answer === question.isFake

  // Hide elements instead of removing them from the DOM so the card layout remains
  // fixed. This is particularly important for mobile card layout.
  const invisibleUnless = (value: boolean) => (value ? "" : "invisible")

  const type = mediaString(question.media.mimeType)
  const { title, description } = question

  return (
    <div className="grow flex flex-col lg:flex-row items-stretch min-h-0 min-w-0 gap-3 md:gap-5">
      <MediaExample media={question.media} isFake={isAnswered ? question.isFake : undefined} isActive={isActive} />
      <div className="flex-1 flex flex-col gap-3 md:gap-5 justify-between">
        <div className="flex flex-col gap-3 md:gap-5 text-sm md:text-lg">
          <div className="flex flex-row gap-4">
            <button
              className={`w-20 md:w-24 text-sm md:text-base ${isAnswered && answer ? "bg-brand-green-dark-400 text-white" : "bg-white text-brand-green-dark-500"} hover:font-bold disabled:hover:font-normal py-2 rounded-full`}
              disabled={isAnswered}
              onClick={() => onAnswer(false)}
            >
              REAL
            </button>
            <button
              className={`w-20 md:w-24 text-sm md:text-base ${isAnswered && !answer ? "bg-brand-green-dark-400 text-white" : "bg-white text-brand-green-dark-500"} hover:font-bold disabled:hover:font-normal py-2 rounded-full`}
              disabled={isAnswered}
              onClick={() => onAnswer(true)}
            >
              FAKE
            </button>
          </div>
          <div className="min-h-40 md:min-h-48">
            {!isAnswered ? (
              <div className="rounded-lg text-sm md:text-base p-3 md:p-4 bg-brand-green-light-500 text-brand-green-500">
                <h1 className="text-base md:text-lg flex items-center mb-1">
                  <HiOutlineExclamationCircle className="inline mr-1 md:text-2xl" />
                  CONTEXT
                </h1>
                <p>{title}</p>
              </div>
            ) : (
              <div
                className={`rounded-lg text-sm md:text-base p-3 md:p-4 ${isCorrect ? "bg-manipulation-low-500 text-brand-green-500" : "bg-manipulation-high-500 text-white"}`}
              >
                <h1 className="text-base md:text-lg flex items-center mb-1">
                  {isCorrect ? (
                    <>
                      <IoCheckmarkOutline className="inline mr-1 text-lg md:text-2xl" />
                      CORRECT
                    </>
                  ) : (
                    <>
                      <HiX className="inline mr-1 text-lg md:text-2xl" />
                      INCORRECT
                    </>
                  )}
                </h1>
                <p>
                  This is a {question.isFake ? "fake" : "real"} {type} of {description}.
                </p>
                <p className="mt-2">
                  TrueMedia.org detected {question.isFake ? "substantial" : "little"} evidence of manipulation.{" "}
                  <Link
                    className="underline"
                    href={"/media/analysis?id=" + question.media.id}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Learn more.
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
        <div className={`w-full flex flex-row justify-center ${invisibleUnless(isAnswered)}`}>
          <button
            className="w-44 md:w-56 flex items-center justify-center text-sm md:text-base text-white border border-lime-500 hover:font-bold py-2 md:py-3 rounded-full"
            onClick={() => swiper.slideNext()}
          >
            NEXT QUESTION
            <span className="ml-2 text-lime-500">
              <FaAngleRight />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
