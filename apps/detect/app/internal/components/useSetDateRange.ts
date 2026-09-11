import { useCallback } from "react"
import { DateRange } from "../summarize"
import useUpdateSearchParams from "./useUpdateSearchParams"

export default function useSetDateRange() {
  const updateSearchParams = useUpdateSearchParams()
  return useCallback(
    (newRange: DateRange) => {
      updateSearchParams((newParams) => {
        if (newRange.from) newParams.set("from", newRange.from)
        else {
          // If no query parameters are set, the backend will default to some bespoke default start date. To keep that
          // from happening when the start date is explicitly cleared, we set the "from" parameter to an empty string.
          newParams.set("from", "")
        }
        if (newRange.to) newParams.set("to", newRange.to)
        else newParams.delete("to")
      })
    },
    [updateSearchParams],
  )
}
