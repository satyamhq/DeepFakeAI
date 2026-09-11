import { IoShareSocial } from "react-icons/io5"
import { Question } from "./page"
import { Answers, getQuizScore } from "./Quiz"
import { Button, Modal } from "flowbite-react"
import { useState } from "react"
import { signInUrl, siteUrl } from "../site"

const ShareResultsButton = ({ score }: { score: number }) => {
  const [showCopied, setShowCopied] = useState(false)

  const textToCopy = `Try the political deepfake challenge! I scored ${score}%. TrueMedia.org is non-profit, non-partisan, and free. ${siteUrl}/quiz`
  const handleCopyResults = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setShowCopied(true)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  return (
    <>
      <Button pill color="lime" className="flex items-center mt-3 mb-0 lg:my-auto lg:ml-5" onClick={handleCopyResults}>
        Share
        <span className="flex items-center ml-2">
          <IoShareSocial />
        </span>
      </Button>
      <Modal show={showCopied} onClose={() => setShowCopied(false)}>
        <Modal.Header>Paste to share your results</Modal.Header>
        <Modal.Body>
          <div>
            We’ve copied your results to your clipboard. Now you can paste into your favorite social media platform to
            share with your friends!
            <blockquote className="m-4 px-4 py-3 border border-lime-500 rounded-md">{textToCopy}</blockquote>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <Button color="gray" onClick={() => setShowCopied(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default function QuizResults({ questions, answers }: { questions: Question[]; answers: Answers }) {
  const { correctAnswerCount, answeredCount, score } = getQuizScore(questions, answers)

  return (
    <div className="flex flex-col flex-1 text-lg px-1 md:px-2">
      <div className="flex flex-col lg:flex-row mt-0 md:mt-1">
        <p className="mt-0 md:mt-1">
          Congratulations on completing the quiz! You answered {answeredCount} questions with {correctAnswerCount}{" "}
          correct ({score}%). Share your score on social media and challenge your friends.
        </p>
        <ShareResultsButton score={score} />
      </div>
      <p className="mt-3 md:mt-5">
        Sign up to get access to TrueMedia.org’s free deepfake detector. TrueMedia.org is non-profit, non-partisan, and
        free.
      </p>
      <div className="flex flex-row justify-center items-center mt-6">
        <Button pill color="lime" className="flex items-center grow lg:grow-0 mb-0 lg:my-auto lg:ml-5" href={signInUrl}>
          Join Now
        </Button>
      </div>
    </div>
  )
}
