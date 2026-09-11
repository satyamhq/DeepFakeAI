/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ["lh3.googleusercontent.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "OPEN-TODO-PLACEHOLDER.public.blob.vercel-storage.com",
        port: "",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: function (config) {
    const path = require("path")
    const mockClerkPath = path.resolve(__dirname, "app/mockClerk.tsx")
    const mockClerkServerPath = path.resolve(__dirname, "app/mockClerkServer.ts")
    config.resolve.alias = {
      ...config.resolve.alias,
      "@clerk/nextjs/server$": mockClerkServerPath,
      "@clerk/nextjs/server": mockClerkServerPath,
      "@clerk/nextjs$": mockClerkPath,
      "@clerk/nextjs": mockClerkPath,
      "@clerk/clerk-react$": mockClerkPath,
      "@clerk/clerk-react": mockClerkPath,
    }

    config.module.rules.push({
      test: /\.ya?ml$/,
      use: "js-yaml-loader",
    })
    return config
  },
}

// Sentry build plugin — only enabled when all required env vars are present.
// Runtime error monitoring (DSN in sentry.*.config.ts) works independently.

const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

if (
  process.env.ENABLE_SENTRY_BUILD_UPLOAD === "true" &&
  sentryOrg &&
  sentryProject &&
  sentryAuthToken &&
  !sentryAuthToken.includes("your-")
) {
  const { withSentryConfig } = require("@sentry/nextjs")

  module.exports = withSentryConfig(module.exports, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: sentryOrg,
    project: sentryProject,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Disable source map upload during build to prevent heap OOM on Render/CI.
    // Source maps can be uploaded separately via `sentry-cli` if needed.
    sourcemaps: {
      disable: true,
    },

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  })
}
