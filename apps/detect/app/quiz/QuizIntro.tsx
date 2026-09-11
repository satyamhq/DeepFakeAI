import React from "react"
import { useSwiper } from "swiper/react"

export default function QuizIntro() {
  const swiper = useSwiper()

  return (
    <div className="flex flex-col flex-1 text-base md:text-xl m-2 md:m-8">
      <p className="mt-1">
        Political deepfakes are a global concern. Manipulated media can have serious consequences, including impacting
        public opinion and electoral outcomes.
      </p>
      <p className="mt-5">
        It’s startling how quickly AI has advanced to the point where most people can no longer tell the difference
        between truth and fiction. Can you?
      </p>
      <button
        className="w-36 md:w-44 mt-auto self-start text-sm md:text-base bg-lime-500 focus:outline-none text-black hover:font-bold disabled:hover:font-normal py-2 md:py-3 rounded-full"
        onClick={() => swiper.slideNext()}
      >
        START QUIZ
      </button>
    </div>
  )
}
