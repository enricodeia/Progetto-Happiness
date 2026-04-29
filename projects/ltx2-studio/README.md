# LTX-2 Studio

A clean, modern web app to generate AI videos with the open-source **LTX-2 19B** model from Lightricks.

Built with Vite + React 19 + the official `@fal-ai/client`. LTX-2 runs on fal.ai (the model requires CUDA, so it cannot run locally on Mac — fal.ai serves it for ~$0.05–$0.30 per short video).

## Features

- **Text-to-video** and **Image-to-video** modes
- **Audio generation** (LTX-2 generates synced audio in the same model)
- Resolution presets (720p / 1080p / 4K) and 5 aspect ratios
- Camera motion presets (dolly, pan, jib)
- Negative prompt + seed control
- Live progress with queue position and logs
- Local history (last 30 generations)
- Cost estimation before each generation
- API key stored locally in your browser, never sent to any third party

## Getting started

### 1. Get a fal.ai API key

Create an account and grab a key from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys). You'll need to add a small amount of credit ($5 covers ~50–100 videos).

### 2. Install and run

```bash
npm install
npm run dev
```

Opens automatically at `http://localhost:5174`. On first launch, paste your fal.ai API key.

### 3. Build for production

```bash
npm run build
npm run preview
```

The static build in `dist/` can be deployed anywhere (Vercel, Netlify, GitHub Pages, etc).

## Pricing reference

LTX-2 19B costs **$0.0018 per megapixel** of output (width × height × frames, rounded up).

| Format | Cost |
|--------|------|
| 5s @ 720p 16:9 | ~$0.21 |
| 6s @ 1080p 16:9 | ~$0.36 |
| 10s @ 4K 16:9 | ~$2.40 |

The app shows an estimate before each generation.

## Tech

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/)
- [@fal-ai/client](https://www.npmjs.com/package/@fal-ai/client) — official JS SDK
- [lucide-react](https://lucide.dev/) — icons
- Plain CSS — no Tailwind, no UI library

## Project structure

```
src/
├── App.jsx              # main wiring
├── main.jsx             # React entry
├── styles.css           # all styles
├── lib/
│   ├── fal.js           # fal.ai client + LTX-2 calls
│   └── storage.js       # localStorage helpers
└── components/
    ├── ApiKeySetup.jsx
    ├── Header.jsx
    ├── PromptComposer.jsx
    ├── VideoStage.jsx
    ├── SettingsPanel.jsx
    └── HistoryPanel.jsx
```

## Why not run locally?

LTX-2 19B requires CUDA >12.7 (NVIDIA GPU only) per the [official docs](https://huggingface.co/Lightricks/LTX-2). On Apple Silicon, the diffusers integration falls back to unoptimized paths and runs out of memory or takes hours per second of video.

If you want a local-only path, the older [LTX-Video 2B](https://huggingface.co/Lightricks/LTX-Video) model does run on M-series Macs via MPS at lower quality.
