"use client"

import { Badge, Radio, Dropdown, TextInput, Button, Datepicker, ButtonGroup } from "flowbite-react"
import { SubstantialEvidence, LittleEvidence, Uncertain } from "../../components/EvidenceLabels"
import { FaHourglass, FaList, FaRegFlag } from "react-icons/fa6"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { FaSearch } from "react-icons/fa"

// Zero out hours, minutes, seconds and milliseconds to make date comparisons easier in the future.
function dateTimeToDate(date: any): Date {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date)
  if (isNaN(d.getTime())) return new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function datesAreEqual(date: any, initialDate: any): boolean {
  if (!date || !initialDate) return false
  const d1 = date instanceof Date ? date : new Date(date)
  const d2 = initialDate instanceof Date ? initialDate : new Date(initialDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function toValidDate(d: any): Date | undefined {
  if (!d) return undefined
  const parsed = d instanceof Date ? d : new Date(d)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

export default function UserHistoryFilters({
  query,
  currentFilter,
  tally,
  filteredCount,
  timeStart,
  timeEnd,
  sortOrder,
  allOrg,
  isImpersonating,
}: {
  query: string
  currentFilter: string
  tally: Record<string, number>
  filteredCount: number
  timeStart?: Date | string | null
  timeEnd?: Date | string | null
  sortOrder: "desc" | "asc"
  allOrg: boolean
  isImpersonating: boolean
}) {
  const router = useRouter()
  const [selectedFilter, setSelectedFilter] = useState(currentFilter)
  const [newQuery, setNewQuery] = useState(query)

  // Keep track of todays date so we know when user's clear their time selections
  const [initialDate] = useState(() => dateTimeToDate(new Date()))

  const validStart = toValidDate(timeStart)
  const validEnd = toValidDate(timeEnd)

  // These dates represent the selected date on the calendar.
  const [startDate, setStartDate] = useState(validStart ?? initialDate)
  const [endDate, setEndDate] = useState(validEnd ?? initialDate)
  const [isStartDateSelected, setIsStartDateSelected] = useState(!!validStart)
  const [isEndDateSelected, setIsEndDateSelected] = useState(!!validEnd)
  const [sortOrderState, setSortOrderState] = useState<"desc" | "asc">(sortOrder)

  const [currentAllOrg, setCurrentAllOrg] = useState(allOrg)

  const isInitialRender = useRef(true)

  const go = useCallback(() => {
    let url = "/media/history"

    const params = new URLSearchParams(window.location.search)
    params.set("filter", selectedFilter)

    if (newQuery && newQuery.trim().length > 1) {
      params.set("q", newQuery.trim())
    }

    if (isStartDateSelected && startDate) {
      const ms = startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime()
      if (!isNaN(ms)) params.set("t0", "" + ms)
    } else {
      params.delete("t0")
    }

    if (isEndDateSelected && endDate) {
      const ms = endDate instanceof Date ? endDate.getTime() : new Date(endDate).getTime()
      if (!isNaN(ms)) params.set("tf", "" + ms)
    } else {
      params.delete("tf")
    }

    if (currentAllOrg) {
      params.set("allOrg", "true")
    } else {
      params.delete("allOrg")
    }

    if (sortOrderState === "asc") {
      params.set("sort", "asc")
    } else {
      params.delete("sort")
    }

    const ss = params.toString()
    if (ss.length > 0) {
      url += "?" + ss
    }

    router.push(url)
  }, [
    selectedFilter,
    currentAllOrg,
    startDate,
    endDate,
    isStartDateSelected,
    isEndDateSelected,
    sortOrderState,
    router,
    newQuery,
  ])

  useEffect(() => {
    if (!isInitialRender.current) {
      go()
    } else {
      isInitialRender.current = false
    }
  }, [go])

  function isInitialDate(date: any) {
    return datesAreEqual(date, initialDate)
  }

  function canonicalizeDate(date: any) {
    return isInitialDate(date) ? initialDate : dateTimeToDate(date)
  }

  function setStart(date: any) {
    setStartDate(canonicalizeDate(date))
    setIsStartDateSelected(true)
  }

  function setEnd(date: any) {
    setEndDate(canonicalizeDate(date))
    setIsEndDateSelected(true)
  }

  function clearDateFilters() {
    setStartDate(initialDate)
    setEndDate(initialDate)
    setIsStartDateSelected(false)
    setIsEndDateSelected(false)
  }

  function dateFilterLabel() {
    const dateToLabel = (date: any) => {
      if (!date) return ""
      const d = date instanceof Date ? date : new Date(date)
      if (isNaN(d.getTime())) return ""
      return `${d.getMonth() + 1}/${d.getDate()}`
    }
    const startDateLabel = dateToLabel(startDate)
    const endDateLabel = dateToLabel(endDate)

    if (!isStartDateSelected && !isEndDateSelected) {
      return "All Time"
    } else if (isStartDateSelected && isEndDateSelected) {
      return `${startDateLabel} to ${endDateLabel}`
    } else if (isStartDateSelected) {
      return `After ${startDateLabel}`
    } else if (isEndDateSelected) {
      return `Before ${endDateLabel}`
    }
  }

  function handleSubmit(ev: React.SyntheticEvent) {
    ev.preventDefault()
    go()
  }

  const FilterDropdownItem = ({ filter, children }: { filter: string; children: React.ReactNode }) => {
    const count = tally[filter] ?? 0
    return (
      <Dropdown.Item onClick={() => setSelectedFilter(filter)}>
        <div className="flex w-full">
          <div className="grid place-content-center mr-4">
            <Radio
              name="filter"
              color="dark"
              readOnly
              checked={selectedFilter === filter}
              onClick={() => setSelectedFilter(filter)}
            />
          </div>
          <div>{children}</div>
          <div className="grid place-content-center">
            <Badge className="ml-4" color="gray">
              {count}
            </Badge>
          </div>
        </div>
      </Dropdown.Item>
    )
  }

  const FilterDropdown = () => (
    <Dropdown dismissOnClick={true} label="Filter" color="dark" className="z-50">
      <FilterDropdownItem filter="high">
        <SubstantialEvidence />
      </FilterDropdownItem>

      <FilterDropdownItem filter="uncertain">
        <Uncertain />
      </FilterDropdownItem>

      <FilterDropdownItem filter="low">
        <LittleEvidence />
      </FilterDropdownItem>

      <FilterDropdownItem filter="unresolved">
        <FaRegFlag className="inline mr-2" /> Unresolved
      </FilterDropdownItem>

      <FilterDropdownItem filter="unknown">
        <FaHourglass className="inline mr-2" /> In Progress
      </FilterDropdownItem>

      <Dropdown.Divider />

      <FilterDropdownItem filter="all">
        <FaList className="inline mr-2" /> All
      </FilterDropdownItem>
    </Dropdown>
  )

  const DateDropdown = () => (
    <Dropdown placement="left" dismissOnClick={true} label={dateFilterLabel()} color="dark" className="z-50">
      <div className="p-4 rounded">
        <div>
          <Button onClick={clearDateFilters} className="w-full" color="gray">
            Clear date filters
          </Button>
        </div>

        <div className="font-bold mt-8">Select start date:</div>
        <Datepicker
          defaultDate={startDate}
          onSelectedDateChanged={setStart}
          showClearButton={false}
          showTodayButton={false}
        />

        <div className="font-bold mt-8">Select end date:</div>
        <Datepicker
          defaultDate={endDate}
          onSelectedDateChanged={setEnd}
          showClearButton={false}
          showTodayButton={false}
        />
      </div>
    </Dropdown>
  )

  const SortOrder = () => (
    <Dropdown
      dismissOnClick={true}
      label={sortOrderState === "desc" ? "Latest" : "Earliest"}
      color="dark"
      className="z-50"
    >
      <Dropdown.Item onClick={() => setSortOrderState("desc")}>Latest</Dropdown.Item>
      <Dropdown.Item onClick={() => setSortOrderState("asc")}>Earliest</Dropdown.Item>
    </Dropdown>
  )

  return (
    <>
      <div className="flex mb-4 w-full justify-between">
        <div className="mb-2">
          {/* Only show these buttons when we're not viewing impersonated history. */}
          {!isImpersonating && (
            <ButtonGroup>
              <Button onClick={() => setCurrentAllOrg(false)} color={currentAllOrg ? "gray" : "lime"}>
                My History
              </Button>
              <Button onClick={() => setCurrentAllOrg(true)} color={currentAllOrg ? "lime" : "gray"}>
                Organization History
              </Button>
            </ButtonGroup>
          )}
        </div>

        <div>
          <span className="text-gray-400">Filtered queries:</span>{" "}
          <span className="text-white font-bold">{(filteredCount ?? 0).toLocaleString()}</span>{" "}
          <span className="text-gray-400">Total queries:</span>{" "}
          <span className="text-white font-bold">{(tally["all"] ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <form className="flex flex-col lg:flex-row grow mb-2 lg:mb-0" onSubmit={handleSubmit}>
        <div className="flex flex-row grow gap-2">
          <TextInput
            icon={FaSearch}
            className="grow"
            placeholder="Search"
            value={newQuery}
            onChange={(ev) => setNewQuery(ev.target.value)}
          />
          <Button className="inline" color="lime" type="submit">
            Search
          </Button>
        </div>
        <div className="user-history-filters flex flex-row gap-2 mt-2 lg:mt-0 lg:ml-2">
          <FilterDropdown />
          <DateDropdown />
          <SortOrder />
        </div>
      </form>
    </>
  )
}
