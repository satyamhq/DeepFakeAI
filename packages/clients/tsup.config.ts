import { defineConfig } from "tsup"

export default defineConfig({
  format: ["esm", "cjs"],
  target: "esnext",
  clean: true,
  sourcemap: true,
  minify: false,
  entry: ["src/*.ts"],
  outDir: "dist",
  external: ["@prisma/client"],
})
