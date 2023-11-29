import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: "index.html",
        content: "src/content.ts",
      },
      output: {
        assetFileNames: "[name][extname]",
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
      },
    },
  },
});
