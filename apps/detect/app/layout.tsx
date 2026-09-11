import { Metadata } from "next"
import Script from "next/script"
import { Flowbite } from "flowbite-react"
import QueryClientProvider from "./components/QueryClientProvider"
import { DebugProvider } from "./components/DebugContext"
import { NavigationProvider } from "./components/navigation/NavigationContext"
import { trueTheme } from "./theme"

const title = "DeepFakeAI - Identifying Political Deepfakes in Social Media Using AI."
const description = "DeepFakeAI detects political deepfakes in social media. Non-profit, non-partisan, and free."
export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "DeepFakeAI",
    url: currentSiteBaseUrl,
    title,
    description,
  },
  metadataBase: new URL(currentSiteBaseUrl),
}

// These styles apply to every route in the application
import "./globals.css"
import { currentSiteBaseUrl } from "./site"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="dark bg-gray-900 flex flex-col min-h-svh text-gray-100">
        <QueryClientProvider>
          <DebugProvider>
            <NavigationProvider isLoggedIn={false}>
              <Flowbite theme={{ mode: "dark", theme: trueTheme }}>{children}</Flowbite>
            </NavigationProvider>
          </DebugProvider>
        </QueryClientProvider>
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS && (
          <>
            <Script
              strategy="lazyOnload"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}`}
            />
            <Script strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || []
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date())
                gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}', {
                  page_path: window.location.pathname,
                  is_logged_in: false,
                })
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
