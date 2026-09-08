import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://adenjessee.dev",
  output: "static",
  adapter: cloudflare({
    imageService: "passthrough",
    platformProxy: {
      enabled: false,
    },
  }),
  integrations: [react()],
  vite: {
    ssr: {
      external: ["node:fs", "node:path", "node:url"],
    },
  },
});
