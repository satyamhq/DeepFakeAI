import { checkRate } from "./util"

it("test rate limit updates", async () => {
  const times = [100, 90, 80, 70, 60]
  const now = 110
  expect(checkRate(now, times, 5, 60)).toBe(undefined)
  expect(checkRate(now, times, 5, 30)).toEqual([110, 100, 90, 80, 70])
})

it("test rate limit short arrays", async () => {
  const now = 110
  expect(checkRate(now, [], 5, 30)).toEqual([110])
  expect(checkRate(now, [100, 90], 5, 30)).toEqual([110, 100, 90])
})

it("test rate all old values", async () => {
  const now = 110
  expect(checkRate(now, [50, 40, 30, 20, 10], 5, 30)).toEqual([110, 50, 40, 30, 20])
})
