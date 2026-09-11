// @ts-check

const reactlint = require("eslint-plugin-react")
const hookslint = require("eslint-plugin-react-hooks")
const configs = require("@truemedia/config-eslint/index.js")
// prettier-ignore
module.exports = [
  ...configs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    plugins: {
      react: reactlint,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactlint.configs.recommended.rules,
      ...reactlint.configs['jsx-runtime'].rules,
      "react/prop-types": "off", // Typescript handles this
    },
  },
  {
    plugins: {
      "react-hooks": hookslint,
    },
    rules: hookslint.configs.recommended.rules,
  },
]
