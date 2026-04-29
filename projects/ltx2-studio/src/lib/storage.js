const KEY_API = 'ltx2_api_key'
const KEY_HISTORY = 'ltx2_history'
const KEY_SETTINGS = 'ltx2_settings'

export const getApiKey = () => localStorage.getItem(KEY_API) || ''
export const setApiKey = (key) => localStorage.setItem(KEY_API, key)
export const clearApiKey = () => localStorage.removeItem(KEY_API)

export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]')
  } catch {
    return []
  }
}

export const addToHistory = (entry) => {
  const list = getHistory()
  const next = [entry, ...list].slice(0, 60)
  localStorage.setItem(KEY_HISTORY, JSON.stringify(next))
  return next
}

export const removeFromHistory = (id) => {
  const next = getHistory().filter((x) => x.id !== id)
  localStorage.setItem(KEY_HISTORY, JSON.stringify(next))
  return next
}

export const clearHistory = () => {
  localStorage.removeItem(KEY_HISTORY)
}

export const defaultSettings = () => ({
  resolution: '720p',
  aspectRatio: '16:9',
  duration: 6,
  generateAudio: true,
  enhancePrompt: true,
  cameraMotion: 'none',
  seed: '',
  negativePrompt: '',
  variants: 1,
  distilled: false,
  loras: [],
  budgetMonthly: 10,
  warnAbove: 0.5
})

export const getSettings = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY_SETTINGS) || 'null')
    return { ...defaultSettings(), ...(stored || {}) }
  } catch {
    return defaultSettings()
  }
}

export const saveSettings = (settings) => {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings))
}
