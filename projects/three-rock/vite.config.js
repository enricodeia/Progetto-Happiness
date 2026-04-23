import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Split big vendor libs into their own long-lived chunks. The initial app
// bundle becomes small; three.js / r3f / post-processing only download once
// per cache lifetime even if the app code churns.
export default defineConfig({
  plugins: [react()],
  server: { port: 5178 },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Order matters: more specific paths first, so `@react-three/*`
          // doesn't fall into the bare `three` bucket via substring match.
          if (id.includes('@react-three'))          return 'r3f'
          if (id.includes('postprocessing'))        return 'postprocessing'
          if (id.includes('/three/'))               return 'three'
          if (id.includes('gsap'))                  return 'gsap'
          if (id.includes('leva'))                  return 'leva'
          if (id.includes('smooothy') || id.includes('lenis')) return 'scroll'
          if (id.includes('react-router'))          return 'router'
          if (id.includes('react-dom'))             return 'react'
        },
      },
    },
  },
})
