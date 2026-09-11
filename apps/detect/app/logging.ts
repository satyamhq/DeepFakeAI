import "server-only"
import pino from "pino"

export type Logger = pino.Logger

export const rootLogger = pino()

export async function withLatency<T>(promise: Promise<T>): Promise<[T, number]> {
  const start = Date.now()
  const result = await promise
  return [result, Date.now() - start]
}
