import { defineConfig } from "tsup"

export default defineConfig({
  format: "cjs",
  target: "esnext",
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  entry: ["src/server.ts", "src/jwt.ts", "src/schemas.ts"],
  outDir: "dist",
  external: ["@prisma/client"],
  noExternal: [/^@truemedia\/.*/],
})
