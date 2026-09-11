import { useCallback, useState } from "react"

/**
 * This hook wraps a server action, providing a loading state and response
 *
 * Usage:
 * ```tsx
 * const [isLoading, startLoading, data] = useAction(actions.loadSomething)
 * return (
 *   <div>
 *     <Button disabled={isLoading} onClick={startLoading}>Load Stuff</Button>
 *     {isLoading && <div>Loading...</div>}
 *     {data && <div>Got Data: {data}</div>}
 *   </div>
 * )
 * ```
 */
export function useAction<Result, Args extends any[]>(action: (...args: Args) => Promise<Result>) {
  const [isPending, setIsPending] = useState(false)
  const [response, setResponse] = useState<Result | null>(null)
  return [
    isPending,
    useCallback(
      (...args: Args) => {
        setIsPending(true)
        action(...args).then((response) => {
          setResponse(response)
          setIsPending(false)
        })
      },
      [action],
    ),
    response,
  ] as const
}
