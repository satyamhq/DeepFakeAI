"use client"

import "swiper/css"
import "swiper/css/keyboard"
import "swiper/css/navigation"

import React, { useState, useEffect, useRef } from "react"
import { Swiper, SwiperClass, SwiperSlide } from "swiper/react"
import { Keyboard, Navigation } from "swiper/modules"
import { Question } from "./page"
import QuizCard from "./QuizCard"
import QuizIntro from "./QuizIntro"
import QuizQuestion from "./QuizQuestion"
import QuizResults from "./QuizResults"

export type Answers = {
  [key: string]: boolean | undefined
}

function getInitialAnswers(questions: Question[]) {
  return questions.reduce((acc, question) => {
    acc[question.id] = undefined
    return acc
  }, {} as Answers)
}

export function getQuizScore(questions: Question[], answers: Answers) {
  const correctAnswerCount = questions.filter((question) => {
    const answer = answers[question.id]
    return answer !== undefined && answer === question.isFake
  }).length

  const answeredCount = questions.filter((question) => {
    const answer = answers[question.id]
    return answer !== undefined
  }).length

  const score = answeredCount ? Math.round((100 * correctAnswerCount) / answeredCount) : 0

  return { correctAnswerCount, answeredCount, score }
}

export default function Quiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Answers>({})
  const [isBeginning, setIsBeginning] = useState(true)
  const [isEnd, setIsEnd] = useState(false)
  const prevRef = useRef(null)
  const nextRef = useRef(null)
  const { correctAnswerCount, answeredCount, score } = getQuizScore(questions, answers)

  useEffect(() => setAnswers(getInitialAnswers(questions)), [questions])

  const handleAnswer = (id: string) => (answer: boolean) => {
    setAnswers((previous) => ({
      ...previous,
      [id]: answer,
    }))
  }

  return (
    <div className="relative flex h-full w-full">
      <Swiper
        className="!w-screen"
        slidesPerView={1.1}
        centeredSlides={true}
        keyboard={{
          enabled: true,
        }}
        onInit={(swiper: SwiperClass) => {
          swiper.on("slideChange", () => {
            setIsBeginning(swiper.isBeginning)
            setIsEnd(swiper.isEnd)
          })
        }}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        modules={[Keyboard, Navigation]}
      >
        {/* The !important directives are to fix swiper bug discussed here:
            https://github.com/nolimits4web/swiper/issues/3599 */}
        <SwiperSlide className="!h-auto">
          {(slideProps) => (
            <QuizCard
              {...slideProps}
              header={
                <span>
                  What’s your <span className="text-lime-500">deepfake</span> IQ?
                </span>
              }
              forceRenderHeader={true}
            >
              <QuizIntro />
            </QuizCard>
          )}
        </SwiperSlide>
        <>
          {questions.map((question, index) => (
            <SwiperSlide key={question.id} className="!h-auto">
              {(slideProps) => (
                <QuizCard
                  {...slideProps}
                  header="Is this real?"
                  footerRight={
                    answeredCount === 0
                      ? undefined
                      : `YOUR SCORE: ${correctAnswerCount} OUT OF ${answeredCount} (${score}%)`
                  }
                  footerLeft={`QUESTION ${index + 1}/${questions.length}`}
                >
                  <QuizQuestion
                    isActive={slideProps.isActive}
                    question={question}
                    answer={answers[question.id]}
                    onAnswer={handleAnswer(question.id)}
                  />
                </QuizCard>
              )}
            </SwiperSlide>
          ))}
        </>
        <SwiperSlide className="!h-auto">
          {(slideProps) => (
            <QuizCard
              {...slideProps}
              header={
                <span>
                  Your <span className="text-lime-500">deepfake</span> IQ score: {score}%
                </span>
              }
            >
              <QuizResults questions={questions} answers={answers} />
            </QuizCard>
          )}
        </SwiperSlide>
      </Swiper>

      {/* Custom navigation buttons on the left and right, not used on mobile */}
      <div
        ref={prevRef}
        className={`hidden lg:block h-full w-[70px] absolute left-0 z-10 ${isBeginning ? "" : "cursor-pointer"}`}
      />
      <div
        ref={nextRef}
        className={`hidden lg:block h-full w-[70px] absolute right-0 z-10 ${isEnd ? "" : "cursor-pointer"}`}
      />
    </div>
  )
}
