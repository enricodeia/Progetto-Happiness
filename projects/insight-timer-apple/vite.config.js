import { defineConfig } from "vite";

// `/v2` … `/v7` are the other editions. Vercel serves them from the
// matching html through cleanUrls; in dev and preview this rewrite does the same.
function rewrite(req, _res, next) {
  const [path, qs] = req.url.split("?");
  const m = path.match(/^\/(v[2-7])\/?$/);
  if (m) req.url = `/${m[1]}.html` + (qs ? "?" + qs : "");
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
      input: { main: "index.html", v2: "v2.html", v3: "v3.html", v4: "v4.html", v5: "v5.html", v6: "v6.html", v7: "v7.html" },
    },
  },
});
