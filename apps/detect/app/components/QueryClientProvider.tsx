"use client"

import React, { useState } from "react"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
// import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental"
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export default function QueryClientProviderCustom({ children }: any) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <>
      <QueryClientProvider client={client}>
        {/* <ReactQueryStreamedHydration> */}
        {children}
        {/* </ReactQueryStreamedHydration> */}
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </>
  )
}
