import React from "react"

export default function QuizCard({
  isActive,
  isPrev,
  isNext,
  header,
  footerLeft,
  footerRight,
  children,
  forceRenderHeader, // for SSR rendering the first card, since isActive's not ready
}: {
  isActive: boolean
  isPrev: boolean
  isNext: boolean
  header: string | JSX.Element
  footerLeft?: string | JSX.Element
  footerRight?: string | JSX.Element
  children: React.ReactNode
  forceRenderHeader?: boolean
}) {
  const isHeaderVisible = forceRenderHeader || isActive
  const isFooterVisible = isActive

  // Right align the card that's before, and left align the card that's after
  // so that they're abutting the viewport and will peek the proper distance
  // at all screen sizes
  let alignChild = "items-center"
  if (isPrev) alignChild = "items-end"
  if (isNext) alignChild = "items-start"

  // &nbsp; are included below to measure text height even when it's not visible
  return (
    <div className={`flex flex-col w-full h-full justify-center ${alignChild}`}>
      <div className="flex flex-col">
        <div
          className={`text-center text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-5 ${isHeaderVisible ? "" : "invisible"}`}
        >
          &nbsp;{header}&nbsp;
        </div>
        <div className="rounded-lg shadow-md flex flex-col w-[320px] max-w-[320px] md:w-[460px] md:max-w-[460px] lg:w-[768px] lg:max-w-[768px] lg:h-auto max-h[768px] aspect-[3/5] lg:aspect-[5/3] border bg-brand-green-dark-500 border-brand-green-dark-700">
          <div className="flex h-full flex-col justify-top gap-2 md:gap-4 p-4 md:p-6">{children}</div>
        </div>
        <div
          className={`flex flex-col lg:flex-row justify-between my-2 text-white ${isFooterVisible ? "" : "invisible"}`}
        >
          <div>&nbsp;{footerLeft}&nbsp;</div>
          <div>&nbsp;{footerRight}&nbsp;</div>
        </div>
      </div>
    </div>
  )
}
