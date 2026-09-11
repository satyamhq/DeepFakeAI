/** @type {import('tailwindcss').Config} */
const flowbite = require("flowbite-react/tailwind")

module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@tremor/**/*.{js,ts,jsx,tsx,mdx}",
    "../../" + flowbite.content(),
  ],
  // Tailwind doesn't recognize dynamically generated class names.
  // This safelist defines classnames that won't be stripped out during minification.
  // https://tailwindcss.com/docs/content-configuration#dynamic-class-names
  safelist: [
    "border-manipulation-low-500",
    "border-manipulation-uncertain-500",
    "border-manipulation-high-500",
    "border-manipulation-trusted-500",
    "border-manipulation-unknown-500",
    "border-manipulation-unresolved-500",
  ],
  plugins: [require("@tailwindcss/forms"), require("@headlessui/tailwindcss"), flowbite.plugin()],
  theme: {
    fontFamily: {
      sans: ["Gellix", "sans-serif"],
    },
    extend: {
      screens: {
        xs: "475px",
      },
      colors: {
        lime: {
          50: "#f6ffe7",
          100: "#f1ffd7",
          200: "#e9ffc3",
          300: "#e2ffaf",
          400: "#dbff9b",
          500: "#d4ff87",
          600: "#b1d471",
          700: "#8daa5a",
          800: "#6a8044",
          900: "#47552d",
          1000: "#2A331B",
        },
        brand: {
          green: {
            // TODO: This should really be named green-darker
            50: "#cdd3d1",
            100: "#acb5b3",
            200: "#82918d",
            300: "#586c67",
            400: "#2f4741",
            500: "#05221b",
            600: "#041c17",
            700: "#031712",
            800: "#03110e",
            900: "#020b09",
            1000: "#010705",
            dark: {
              50: "#d0d7d6",
              100: "#b1bdba",
              200: "#8a9c98",
              300: "#637b75",
              400: "#3c5a53",
              500: "#153930",
              600: "#123028",
              700: "#0e2620",
              800: "#0b1d18",
              900: "#071310",
              1000: "#040b0a",
            },
            light: {
              50: "#f0f3ee",
              100: "#e5ebe3",
              200: "#d9e1d5",
              300: "#ccd7c6",
              400: "#bfcdb8",
              500: "#b2c3aa",
              600: "#94a38e",
              700: "#778271",
              800: "#596255",
              900: "#3b4139",
              1000: "#242722",
            },
          },
        },
        manipulation: {
          low: {
            500: "#93EF23",
          },
          uncertain: {
            500: "#F1F521",
          },
          high: {
            500: "#FF0F00",
          },
          trusted: {
            500: "#93EF23",
          },
          unknown: {
            500: "#D1D5DB",
          },
          unresolved: {
            500: "#708090",
          },
        },
      },
    },
  },
}
