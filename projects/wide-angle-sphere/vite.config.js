import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two pages: the scroll piece at `/`, and the teacher hero at `/teach.html`.
// Dev serves both without any of this; the config is what makes `vite build`
// emit the second one too.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        teach: resolve(import.meta.dirname, "teach.html"),
      },
    },
  },
});
