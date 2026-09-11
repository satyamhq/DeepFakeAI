import { Metadata } from "next"
import Script from "next/script"
import { Flowbite } from "flowbite-react"
import QueryClientProvider from "./components/QueryClientProvider"
import { DebugProvider } from "./components/DebugContext"
import { NavigationProvider } from "./components/navigation/NavigationContext"
import { trueTheme } from "./theme"
import { ClerkProvider, SignedIn } from "@clerk/nextjs"
import { auth as clerkAuth } from "@clerk/nextjs/server"

const title = "TrueMedia.org - Identifying Political Deepfakes in Social Media Using AI."
const description = "TrueMedia.org detects political deepfakes in social media. Non-profit, non-partisan, and free."
export const metadata: Metadata = {
  title,
  description,
  icons: "/icon.png",
  openGraph: {
    type: "website",
    siteName: "TrueMedia.org",
    url: currentSiteBaseUrl,
    title,
    description,
    images: `/truemedia-open-graph.png`,
  },
  metadataBase: new URL(currentSiteBaseUrl),
}

// These styles apply to every route in the application
import "./globals.css"
import { currentSiteBaseUrl, signInUrl, signUpUrl } from "./site"
import { dark } from "@clerk/themes"
import { SyncActiveOrganization } from "./components/SyncActiveOrganization"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkSession = clerkAuth()
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="dark bg-gray-900 flex flex-col min-h-svh">
        <ClerkProvider
          signInUrl={signInUrl}
          signUpUrl={signUpUrl}
          appearance={{
            baseTheme: dark,
            variables: {
              // The primary color used throughout the components.
              // colorPrimary: '',

              // The color used for error states.
              // colorDanger: '',

              // The color used for success states.
              colorSuccess: "",

              // The color used for warning states.
              colorWarning: "",

              // The color that will be used for all to generate the neutral shades the components use. This option applies to borders, backgrounds for hovered elements, hovered dropdown options.
              colorNeutral: "",

              // The color used for text.
              colorText: "",

              // The color used for text on the primary background.
              colorTextOnPrimaryBackground: "",

              // The color used for secondary text.
              colorTextSecondary: "",

              // The background color for the card container.
              // colorBackground: 'rgb(24, 31, 42)',
              colorBackground: "#111928",

              // The color used for text in input fields.
              colorInputText: "",

              colorInputBackground: "",
            },
            elements: {
              input:
                "rounded border border-gray-600 bg-gray-700 focus:ring-2 text-cyan-600 focus:ring-cyan-600 ring-offset-gray-800",
              tagInputContainer: "bg-gray-50 dark:bg-gray-800",
              tagPillContainer: "text-green-300 bg-green-800 hover:bg-green-600",
              formButtonPrimary:
                "focus:z-10 focus:outline-none bg-lime-500 hover:bg-lime-600 text-slate-800 rounded-lg !shadow-none",
              membersPageInviteButton: "border-lime-500 bg-lime-500 hover:bg-lime-600 !shadow-none",
              organizationSwitcherTrigger: { width: "100%", padding: 0 },
            },
          }}
        >
          <QueryClientProvider>
            <DebugProvider>
              <NavigationProvider isLoggedIn={!!clerkSession.userId}>
                <SignedIn>
                  <SyncActiveOrganization />
                </SignedIn>
                <Flowbite theme={{ mode: "dark", theme: trueTheme }}>{children}</Flowbite>
              </NavigationProvider>
            </DebugProvider>
          </QueryClientProvider>
        </ClerkProvider>
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
              user_id: '${clerkSession.userId || ""}',
              is_logged_in: ${clerkSession.userId ? "true" : "false"},
              is_internal: ${clerkSession.sessionClaims?.email?.includes("@truemedia.org") ? "true" : "false"},
            })
          `}
        </Script>
      </body>
    </html>
  )
}
