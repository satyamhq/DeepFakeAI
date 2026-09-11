"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button, Card } from "flowbite-react"
import { HiExclamationCircle } from "react-icons/hi"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  title?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught client-side exception:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="w-full max-w-2xl mx-auto my-8 p-4">
          <Card className="border-red-500/40 bg-gray-900/90 shadow-xl">
            <div className="flex items-center gap-3 text-red-400 text-xl font-bold">
              <HiExclamationCircle className="text-2xl text-red-500 shrink-0" />
              <span>{this.props.title || "Something went wrong while rendering this section"}</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              An issue occurred while displaying these results. The file data is safe, but some visualization features
              may be temporarily unavailable.
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                color="light"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </Button>
              <Button
                color="cyan"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
