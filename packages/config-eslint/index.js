// @ts-check

const eslint = require("@eslint/js")
const tseslint = require("typescript-eslint")
const importPlugin = require("eslint-plugin-import")

// /** @type {import("@typescript-eslint/utils").TSESLint.FlatConfig.ConfigArray} */
module.exports = tseslint.config(
  { files: ["**/*.ts", "**/*.tsx"] },
  { ignores: ["**/.next/**", "**/*.js", "**/dist/*.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  importPlugin.flatConfigs?.recommended,
  importPlugin.flatConfigs?.typescript,
  {
    rules: { "import/no-extraneous-dependencies": "error" },
    settings: {
      "import/resolver": {
        // You will also need to install and configure the TypeScript resolver
        // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
        typescript: {
          alwaysTryTypes: true,
          project: ["packages/*/tsconfig.json", "apps/*/tsconfig.json"],
        },
        node: true,
      },
    },
  },
)
