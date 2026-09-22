import { defineConfig } from "vite";

// `/v2` is the second edition. Vercel serves it from v2.html through
// cleanUrls; in dev and preview this little rewrite does the same.
function rewrite(req, _res, next) {
  const [path, qs] = req.url.split("?");
  if (path === "/v2" || path === "/v2/") req.url = "/v2.html" + (qs ? "?" + qs : "");
  next();
}
const cleanUrls = {
  name: "clean-urls",
  configureServer(server) { server.middlewares.use(rewrite); },
  configurePreviewServer(server) { server.middlewares.use(rewrite); },
};

export default defineConfig({
  plugins: [cleanUrls],
  // the studio bin travels as a plain asset — its URL import in bowlGeo.js
  assetsInclude: ["**/*.bin"],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: { main: "index.html", v2: "v2.html" },
    },
  },
});
