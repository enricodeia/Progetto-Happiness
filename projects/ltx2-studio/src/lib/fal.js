import { fal } from '@fal-ai/client'
import { getApiKey } from './storage'

let configured = false
let lastKey = ''

const ensureConfigured = () => {
  const key = getApiKey()
  if (!key) throw new Error('Missing fal.ai API key')
  if (!configured || key !== lastKey) {
    fal.config({ credentials: key })
    configured = true
    lastKey = key
  }
}

const VIDEO_SIZE_MAP = {
  '16:9': 'landscape_16_9',
  '4:3': 'landscape_4_3',
  '1:1': 'square_hd',
  '3:4': 'portrait_4_3',
  '9:16': 'portrait_16_9'
}

const APPROX_DIMS = {
  '16:9': { w: 1280, h: 720 },
  '4:3': { w: 1024, h: 768 },
  '1:1': { w: 1024, h: 1024 },
  '3:4': { w: 768, h: 1024 },
  '9:16': { w: 720, h: 1280 }
}

const baseEndpoint = (mode, settings) => {
  const root = settings.distilled
    ? 'fal-ai/ltx-2-19b/distilled'
    : 'fal-ai/ltx-2-19b'
  switch (mode) {
    case 'image': return `${root}/image-to-video${(settings.loras?.length || 0) > 0 ? '/lora' : ''}`
    case 'video': return `${root}/video-to-video/lora`
    case 'audio': return `${root}/audio-to-video${(settings.loras?.length || 0) > 0 ? '/lora' : ''}`
    case 'text':
    default:      return `${root}/text-to-video${(settings.loras?.length || 0) > 0 ? '/lora' : ''}`
  }
}

const buildBaseInput = (prompt, settings) => {
  const numFrames = Math.round(settings.duration * 25)
  const input = {
    prompt,
    num_frames: numFrames,
    video_size: VIDEO_SIZE_MAP[settings.aspectRatio] || 'landscape_16_9',
    fps: 25,
    generate_audio: !!settings.generateAudio,
    enable_prompt_expansion: !!settings.enhancePrompt,
    acceleration: 'regular',
    video_quality: settings.resolution === '4k' ? 'maximum' : 'high'
  }
  if (settings.cameraMotion && settings.cameraMotion !== 'none') {
    input.camera_lora = settings.cameraMotion
  }
  if (settings.negativePrompt && settings.negativePrompt.trim()) {
    input.negative_prompt = settings.negativePrompt
  }
  const validLoras = (settings.loras || []).filter((l) => l?.path?.trim())
  if (validLoras.length > 0) {
    input.loras = validLoras.map((l) => ({
      path: l.path.trim(),
      scale: typeof l.scale === 'number' ? l.scale : Number(l.scale) || 1
    }))
  }
  return input
}

const seedFromValue = (value) => {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

const runOne = async (endpoint, input, onProgress) => {
  const result = await fal.subscribe(endpoint, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (!onProgress) return
      onProgress({
        status: update.status,
        logs: update.logs?.map((l) => l.message) || [],
        position: update.queue_position
      })
    }
  })
  return result.data
}

export const generate = async ({ mode, prompt, settings, refs = {}, onProgress }) => {
  ensureConfigured()
  const endpoint = baseEndpoint(mode, settings)
  const baseInput = buildBaseInput(prompt, settings)

  if (mode === 'image' && refs.imageUrl) baseInput.image_url = refs.imageUrl
  if (mode === 'video' && refs.videoUrl) baseInput.video_url = refs.videoUrl
  if (mode === 'audio' && refs.audioUrl) baseInput.audio_url = refs.audioUrl

  const variants = Math.max(1, Math.min(4, settings.variants || 1))
  const seedSetting = seedFromValue(settings.seed)

  const inputs = Array.from({ length: variants }, (_, i) => {
    const seed = seedSetting != null ? seedSetting + i : Math.floor(Math.random() * 1_000_000_000)
    return { ...baseInput, seed }
  })

  const promises = inputs.map((input, i) =>
    runOne(endpoint, input, (update) => onProgress?.({ ...update, variantIndex: i, totalVariants: variants }))
  )

  return Promise.all(promises)
}

export const uploadFile = async (file) => {
  ensureConfigured()
  return fal.storage.upload(file)
}

export const estimateCost = (settings) => {
  const dims = APPROX_DIMS[settings.aspectRatio] || APPROX_DIMS['16:9']
  const frames = Math.round(settings.duration * 25)
  const megapixels = (dims.w * dims.h * frames) / 1_000_000
  const perVariant = Math.ceil(megapixels) * 0.0018
  const variants = Math.max(1, Math.min(4, settings.variants || 1))
  const distilledFactor = settings.distilled ? 0.5 : 1
  return perVariant * variants * distilledFactor
}
