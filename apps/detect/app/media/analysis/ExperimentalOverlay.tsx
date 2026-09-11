import { useState } from "react"
import { HiX, HiOutlineExclamationCircle } from "react-icons/hi"

export default function ExperimentalOverlay({ isExperimental }: { isExperimental: boolean }) {
  const [isOpened, setIsOpened] = useState<boolean>(true)

  if (!isOpened || !isExperimental) return null

  return (
    <div className="absolute m-1 bottom-0 left-0 right-0 flex items-center justify-between bg-black bg-opacity-70 text-white p-4">
      <div className="ml-2">
        <h2 className="flex items-center text-xl font-bold my-1">
          <HiOutlineExclamationCircle className="inline mr-2 text-2xl" />
          Experimental Result
        </h2>
      </div>
      <button onClick={() => setIsOpened(false)}>
        <HiX className="h-6 w-6 text-gray-500 mr-1" />
      </button>
    </div>
  )
}
