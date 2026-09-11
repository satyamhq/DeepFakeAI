/**
 * Run a function in a loop until it is canceled.
 */
export type Loop = { cancel: () => Promise<void>; catch: (fn: (err: unknown) => void) => Loop }
export function cancelableAsyncLoop(fn: () => Promise<void>, onError: (err: unknown) => void): Loop {
  let canceled = false
  let currentIterationPromise: Promise<void>
  const loop = async () => {
    while (!canceled) {
      currentIterationPromise = fn()
      await currentIterationPromise
    }
  }

  let promise = loop().catch(onError)
  const loopObj = {
    cancel: () => {
      canceled = true
      return currentIterationPromise
    },
    catch: (fn: (err: unknown) => void) => {
      promise = promise.catch(fn)
      return loopObj
    },
  }
  return loopObj
}

/**
 * A class that models an infinitely running loop which can be started and stopped.
 */
export class Looper {
  private _running = false
  private loop: Loop | null = null

  constructor(
    private fn: () => Promise<void>,
    private onError: (err: unknown) => void,
  ) {}

  get running() {
    return this._running
  }

  stop(): Promise<void> {
    if (!this._running) return Promise.resolve()
    this._running = false
    if (!this.loop) return Promise.resolve()
    return this.loop.cancel()
  }

  start(): this {
    if (this._running) return this
    this._running = true
    this.loop = cancelableAsyncLoop(this.fn, (err) => {
      this.stop()
      this.onError(err)
    })
    return this
  }

  catch(fn: (err: unknown) => void): this {
    this.onError = fn
    return this
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a looper that loops at a fixed interval which can be changed.
 * In addition to the start/stop methods, you can also get/set the interval.
 */
export class Poller extends Looper {
  constructor(
    fn: () => Promise<void>,
    onError: (err: unknown) => void,
    public intervalMillis: number | (() => number),
  ) {
    super(async () => {
      await fn()
      await sleep(typeof this.intervalMillis === "function" ? this.intervalMillis() : this.intervalMillis)
    }, onError)
  }
}
