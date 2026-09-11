import { cancelableAsyncLoop, sleep, Looper, Poller } from "./util"

// Fake timers using Jest
beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

const state: { counter: number; error: unknown } = { counter: 0, error: null }
beforeEach(() => {
  state.counter = 0
  state.error = null
})

describe("cancelableAsyncLoop", () => {
  it("should run the loop until canceled", async () => {
    const loop = cancelableAsyncLoop(async () => {
      await sleep(1)
      state.counter++
    }, console.error)
    expect(state.counter).toBe(0)
    // Let the loop run for some iterations
    await jest.advanceTimersByTimeAsync(10)
    expect(state.counter).toBe(10)
    // Cancel the loop
    let lastIterationFinished = false
    loop.cancel().then(() => {
      lastIterationFinished = true
    })
    expect(lastIterationFinished).toBe(false)
    await jest.advanceTimersToNextTimerAsync()
    // the last iteration that was in flight should finish
    expect(lastIterationFinished).toBe(true)
    expect(state.counter).toBe(11)
    // the loop should not continue
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(11)
  })
  it("should stop if an error is thrown", async () => {
    let error: unknown = null
    cancelableAsyncLoop(
      async () => {
        await sleep(1)
        state.counter++
        if (state.counter > 10) {
          throw new Error("test")
        }
      },
      (err) => {
        error = err
      },
    )
    // Let the loop run for a couple of iterations
    await jest.advanceTimersByTimeAsync(100)
    expect(state.counter).toBe(11)
    expect(error).not.toBeNull()
  })
})

describe("Looper", () => {
  let looper: Looper
  beforeEach(() => {
    looper = new Looper(async () => {
      await sleep(1)
      state.counter++
    }, console.error)
  })
  afterEach(() => {
    looper.stop()
  })

  it("should not run the loop until started", async () => {
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(0)
    expect(looper.running).toBe(false)
    looper.start()
    expect(looper.running).toBe(true)
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(1)
  })

  it("should stop the loop when stopped", async () => {
    looper.start()
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(1)
    looper.stop()
    expect(looper.running).toBe(false)
    await jest.advanceTimersToNextTimerAsync()
    // Note that the currently running loop will finish it's current iteration before
    // being stopped since promises can't be interrupted while in flight
    expect(state.counter).toBe(2)
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(2)
    expect(looper.running).toBe(false)
  })

  it("should restart the loop when started again", async () => {
    looper.start()
    await jest.advanceTimersToNextTimerAsync()
    looper.stop()
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(2)
    looper.start()
    await jest.advanceTimersToNextTimerAsync()
    expect(state.counter).toBe(3)
  })

  describe("error handling", () => {
    it("should stop if there is an error", async () => {
      let errorThrown = false
      const looper = new Looper(
        async () => {
          state.counter++
          if (state.counter > 10) {
            throw new Error("test")
          }
        },
        () => {
          errorThrown = true
        },
      ).start()
      await jest.advanceTimersByTimeAsync(100)
      expect(errorThrown).toBe(true)
      expect(state.counter).toBe(11)
      expect(looper.running).toBe(false)
    })

    it("should call the onError method if there is an error", async () => {
      const looper = new Looper(
        async () => {
          state.counter++
          if (state.counter > 10) {
            throw new Error("test")
          }
        },
        (err) => {
          state.error = err
        },
      ).start()
      await jest.advanceTimersByTimeAsync(100)
      expect(looper.running).toBe(false)
      expect(state.counter).toBe(11)
      expect(state.error).toBeInstanceOf(Error)
      expect((state.error as Error).message).toBe("test")
    })
  })
})

describe("Poller", () => {
  let poller: Poller
  beforeEach(() => {
    poller = new Poller(
      async () => {
        state.counter++
      },
      console.error,
      10,
    )
  })
  it("should call the function at the specified interval", async () => {
    expect(poller.intervalMillis).toBe(10)
    poller.start()
    expect(state.counter).toBe(1)
    await jest.advanceTimersByTimeAsync(5)
    expect(state.counter).toBe(1)
    await jest.advanceTimersByTimeAsync(10)
    expect(state.counter).toBe(2)
    await jest.advanceTimersByTimeAsync(400)
    expect(state.counter).toBe(42)
  })

  it("should be able to change the interval", async () => {
    poller.start()
    expect(state.counter).toBe(1)
    await jest.advanceTimersByTimeAsync(50)
    expect(state.counter).toBe(6)
    poller.intervalMillis = 20
    await jest.advanceTimersByTimeAsync(50)
    expect(state.counter).toBe(9)
  })

  it("should stop when an error is encountered", async () => {
    const poller = new Poller(
      async () => {
        state.counter++
        if (state.counter > 10) {
          throw new Error("test")
        }
      },
      (err) => {
        state.error = err
      },
      10,
    ).start()
    await jest.advanceTimersByTimeAsync(100)
    expect(poller.running).toBe(false)
    expect(state.counter).toBe(11)
    expect(state.error).toBeInstanceOf(Error)
    expect((state.error as Error).message).toBe("test")
  })
})
