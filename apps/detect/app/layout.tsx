import { Metadata } from "next"
import Script from "next/script"
import { Flowbite } from "flowbite-react"
import QueryClientProvider from "./components/QueryClientProvider"
import { DebugProvider } from "./components/DebugContext"
import { NavigationProvider } from "./components/navigation/NavigationContext"
import { trueTheme } from "./theme"
import { ClerkProvider, SignedIn } from "@clerk/nextjs"
import { auth as clerkAuth } from "@clerk/nextjs/server"

const title = "DeepFakeAI - Identifying Political Deepfakes in Social Media Using AI."
const description = "DeepFakeAI detects political deepfakes in social media. Non-profit, non-partisan, and free."
export const metadata: Metadata = {
  title,
  description,
  icons: "/icon.png",
  openGraph: {
    type: "website",
    siteName: "DeepFakeAI",
    url: currentSiteBaseUrl,
    title,
    description,
    images: `/deepfakeai-open-graph.png`,
  },
  metadataBase: new URL(currentSiteBaseUrl),
}

// These styles apply to every route in the application
import "./globals.css"
import { currentSiteBaseUrl, signInUrl, signUpUrl } from "./site"
import { dark } from "@clerk/themes"
import { SyncActiveOrganization } from "./components/SyncActiveOrganization"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let clerkSession: any = { userId: null, sessionClaims: null }
  try {
    clerkSession = clerkAuth()
  } catch {
    // Falls back to unauthenticated when in local development with mock keys
  }
  const isMockClerkKey =
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("ZXhhbXBsZS") ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk")

  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="dark bg-gray-900 flex flex-col min-h-svh">
        {isMockClerkKey && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (typeof window !== 'undefined' && (!window.Clerk || !window.Clerk.loaded)) {
                  var noop = function() {};
                  var listeners = [];
                  window.Clerk = {
                    loaded: true,
                    version: '5.3.0',
                    client: { sessions: [], activeSessions: [] },
                    session: null,
                    user: null,
                    organization: null,
                    telemetry: { record: noop },
                    load: function() { return Promise.resolve(); },
                    addListener: function(fn) { listeners.push(fn); return function() {}; },
                    mountSignIn: function(el) {
                      if (el) el.innerHTML = '<div style="background:#1f2937;color:#f3f4f6;padding:24px;border-radius:12px;max-width:400px;margin:auto;text-align:center;border:1px solid #374151"><h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px">Local Development Mode</h3><p style="color:#9ca3af;font-size:0.875rem;margin-bottom:16px">Running with placeholder Clerk keys. To enable sign-in, add your real Clerk keys to .env.</p><a href="/" style="display:inline-block;background:#84cc16;color:#1e293b;padding:8px 16px;border-radius:8px;font-weight:600;text-decoration:none">Back to Home</a></div>';
                    },
                    unmountSignIn: function(el) { if (el) el.innerHTML = ''; },
                    mountSignUp: function(el) {
                      if (el) el.innerHTML = '<div style="background:#1f2937;color:#f3f4f6;padding:24px;border-radius:12px;max-width:400px;margin:auto;text-align:center;border:1px solid #374151"><h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px">Local Development Mode</h3><p style="color:#9ca3af;font-size:0.875rem;margin-bottom:16px">Running with placeholder Clerk keys. To enable sign-up, add your real Clerk keys to .env.</p><a href="/" style="display:inline-block;background:#84cc16;color:#1e293b;padding:8px 16px;border-radius:8px;font-weight:600;text-decoration:none">Back to Home</a></div>';
                    },
                    unmountSignUp: function(el) { if (el) el.innerHTML = ''; },
                    mountUserButton: noop,
                    unmountUserButton: noop,
                    mountOrganizationSwitcher: noop,
                    unmountOrganizationSwitcher: noop,
                    mountUserProfile: noop,
                    unmountUserProfile: noop,
                    openSignIn: noop,
                    openSignUp: noop,
                    openUserProfile: noop,
                    openGoogleOneTap: noop,
                    openOrganizationProfile: noop,
                    buildSignInUrl: function() { return '/signin'; },
                    buildSignUpUrl: function() { return '/signup'; },
                    buildAfterSignInUrl: function() { return '/'; },
                    buildAfterSignUpUrl: function() { return '/'; },
                    buildUserProfileUrl: function() { return '/user'; },
                    buildCreateOrganizationUrl: function() { return '/create-org'; },
                    buildOrganizationProfileUrl: function() { return '/org'; },
                    handleRedirectCallback: function() { return Promise.resolve(); },
                    handleGoogleOneTapCallback: function() { return Promise.resolve(); },
                    handleEmailLinkVerification: function() { return Promise.resolve(); },
                    authenticateWithMetamask: function() { return Promise.resolve(); },
                    authenticateWithGoogleOneTap: function() { return Promise.resolve(); },
                    createOrganization: function() { return Promise.resolve(); },
                    getOrganization: function() { return Promise.resolve(null); },
                    signOut: function() { return Promise.resolve(); }
                  };
                }
              `,
            }}
          />
        )}
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
              is_internal: ${clerkSession.sessionClaims?.email?.includes("@deepfakeai.org") ? "true" : "false"},
            })
          `}
        </Script>
      </body>
    </html>
  )
}
