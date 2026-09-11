"use client"

import Link from "next/link"
import { Trulean } from "@prisma/client"
import { Accordion } from "flowbite-react"
import { CiSquareMore } from "react-icons/ci"
import { FaRegCheckCircle } from "react-icons/fa"
import { FaRegCircleXmark } from "react-icons/fa6"
import { meansFake, meansReal, meansUnknown } from "../../data/groundTruth"
import { tableHeader, tableRow, showText } from "../../internal/ui"
import { FeedbackWithUser } from "./ResultsPage"

const TableRealIcon = () => <FaRegCheckCircle title="Real" className="m-auto text-green-500 text-2xl" />
const TableFakeIcon = () => <FaRegCircleXmark title="Fake" className="m-auto text-red-500 text-2xl" />
const IconForFakeness = ({ fake }: { fake: Trulean }) =>
  fake === "FALSE" ? <TableRealIcon /> : fake === "TRUE" ? <TableFakeIcon /> : <></>

const headers = tableHeader(["Real?", "User", "Comments"])
const rowFormatter = (item: FeedbackWithUser) =>
  tableRow(
    item.userId,
    [
      (item) => <IconForFakeness fake={item.fake} />,
      (item) => (
        <Link
          className="text-nowrap text-top"
          href={"/internal/users?q=" + item.user.email}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.user.email ?? "<missing>"}
          <CiSquareMore className="inline mx-1" />
        </Link>
      ),
      (item) => <div>{showText(item.comments)}</div>,
    ],
    item,
  )

const sortFunction = (a: FeedbackWithUser, b: FeedbackWithUser) => {
  // Sort users with comments first within each assessment
  if (!!a.comments === !!b.comments) return 0
  if (a.comments) return -1
  return 1
}

export default function FeedbackTable({ feedback }: { feedback: FeedbackWithUser[] }) {
  const fake = feedback.filter((item) => meansFake(item.fake)).sort(sortFunction)
  const real = feedback.filter((item) => meansReal(item.fake)).sort(sortFunction)
  const unknown = feedback.filter((item) => meansUnknown(item.fake)).sort(sortFunction)

  return (
    <div>
      <div className="text-xl mt-5 mb-5">
        <p>
          <FaRegCircleXmark className="inline text-red-500 mr-2" />
          {fake.length} {fake.length == 1 ? "user says" : "users say"} this is fake
        </p>
        <p>
          <FaRegCheckCircle className="inline text-green-500 mr-2" />
          {real.length} {real.length == 1 ? "user says" : "users say"} this is real
        </p>
      </div>
      <Accordion collapseAll>
        <Accordion.Panel>
          <Accordion.Title>User Feedback</Accordion.Title>
          <Accordion.Content>
            <table className="w-full table-auto border border-collapse border-slate-500 bg-slate-800">
              <thead>{headers}</thead>
              <tbody>
                {fake.map(rowFormatter)}
                {real.map(rowFormatter)}
                {unknown.map(rowFormatter)}
              </tbody>
            </table>
          </Accordion.Content>
        </Accordion.Panel>
      </Accordion>
    </div>
  )
}
