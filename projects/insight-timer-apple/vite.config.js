import { defineConfig } from "vite";

export default defineConfig({
  // the studio bin travels as a plain asset — its URL import in bowlGeo.js
  assetsInclude: ["**/*.bin"],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
});
