import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.ts (the dev-server config) so testing
// dependencies/setup can never affect `npm run dev` or the production build.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "**/*.test.{ts,tsx}", "src/main.tsx"],
    },
  },
});
