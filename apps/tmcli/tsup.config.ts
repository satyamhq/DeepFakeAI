import { defineConfig } from "tsup"

export default defineConfig({
  format: "esm",
  target: "esnext",
  clean: true,
  sourcemap: true,
  minify: false,
  entry: ["src/*.ts"],
  outDir: "dist",
  external: ["@prisma/client"],
})
