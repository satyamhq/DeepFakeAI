import { useState } from "react"
import { Modal } from "flowbite-react"
import { FiHelpCircle } from "react-icons/fi"

export default function FilterHelp() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <>
      <FiHelpCircle className="cursor-pointer" onClick={() => setShowHelp(true)} />
      <Modal show={showHelp} onClose={() => setShowHelp(false)}>
        <Modal.Header>Filter Syntax</Modal.Header>
        <Modal.Body>
          <div>
            Required: <code>word</code>
          </div>
          <div>
            Optional: <code>?word</code>
          </div>
          <div>
            Exclude: <code>-word</code>
          </div>
          <div>When any optional words are present, at least one optional word must match.</div>
          <div className="mt-3">
            <b>Examples:</b>
          </div>
          <div>
            <code>eval biden</code> ⇒ must contain both <em>eval</em> and <em>biden</em>.
          </div>
          <div>
            <code>eval ?biden ?trump</code> ⇒ must contain <em>eval</em> and one of <em>biden</em> or <em>trump</em>.
          </div>
          <div>
            <code>eval -atv</code> ⇒ must contain <em>eval</em> and must not contain <em>atv</em>.
          </div>
        </Modal.Body>
      </Modal>
    </>
  )
}
