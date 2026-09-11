/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
})

// Add any custom config to be passed to Jest
const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  coverageProvider: "v8",

  // We're testing server-side code, so we can't use the jsdom test environment. It would be nice if we could somehow
  // have two Jest configurations: one for testing server-only code, and one for testing client/server code.
  // testEnvironment: "jsdom",

  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
