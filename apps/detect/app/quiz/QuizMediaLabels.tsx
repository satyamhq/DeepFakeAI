import { FaRegCircleXmark } from "react-icons/fa6"
import { HiOutlineShieldCheck } from "react-icons/hi2"

export function FakeBadge({ mediaString }: { mediaString: string }) {
  return (
    <div className="flex items-center bg-manipulation-high-500 text-white text-base md:text-lg rounded-md py-1 px-3 md:px-4">
      <FaRegCircleXmark className="inline mr-2 text-xl" />
      Manipulated {mediaString}
    </div>
  )
}

export function RealBadge({ mediaString }: { mediaString: string }) {
  return (
    <div className="flex items-center bg-manipulation-low-500 text-brand-green-500 text-base md:text-lg rounded-md py-1 px-3 md:px-4">
      <HiOutlineShieldCheck className="inline mr-2 text-xl" />
      Real {mediaString}
    </div>
  )
}
