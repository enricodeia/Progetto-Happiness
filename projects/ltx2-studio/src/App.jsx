import { useEffect, useMemo, useState } from 'react'
import ApiKeySetup from './components/ApiKeySetup'
import Header from './components/Header'
import PromptComposer from './components/PromptComposer'
import VideoStage from './components/VideoStage'
import SettingsPanel from './components/SettingsPanel'
import HistoryPanel from './components/HistoryPanel'
import UsagePanel from './components/UsagePanel'
import ConfirmModal from './components/ConfirmModal'
import {
  getApiKey,
  clearApiKey,
  getHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  getSettings,
  saveSettings,
  defaultSettings
} from './lib/storage'
import {
  generate,
  uploadFile,
  estimateCost
} from './lib/fal'
import { recordUsage, getMonthlySpend } from './lib/usage'

const PANEL_NONE = null
const PANEL_SETTINGS = 'settings'
const PANEL_HISTORY = 'history'
const PANEL_USAGE = 'usage'

export default function App() {
  const [hasKey, setHasKey] = useState(() => !!getApiKey())
  const [mode, setMode] = useState('text')
  const [prompt, setPrompt] = useState('')
  const [refFile, setRefFile] = useState(null)
  const [settings, setSettings] = useState(() => ({ ...defaultSettings(), ...getSettings() }))
  const [openPanel, setOpenPanel] = useState(PANEL_NONE)
  const [history, setHistory] = useState(() => getHistory())
  const [currentVideo, setCurrentVideo] = useState(null)
  const [variants, setVariants] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [monthlySpend, setMonthlySpend] = useState(() => getMonthlySpend())
  const [pendingConfirm, setPendingConfirm] = useState(null)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const cost = useMemo(() => estimateCost(settings), [settings])

  const togglePanel = (which) => setOpenPanel((cur) => (cur === which ? PANEL_NONE : which))

  const startGeneration = async () => {
    setError('')
    setIsGenerating(true)
    setProgress({ status: 'IN_QUEUE', logs: [] })
    setCurrentVideo(null)
    setVariants(null)
    try {
      const refs = {}
      if (mode !== 'text') {
        if (!refFile) throw new Error(`Upload a ${mode} file first`)
        const url = await uploadFile(refFile)
        if (mode === 'image') refs.imageUrl = url
        if (mode === 'video') refs.videoUrl = url
        if (mode === 'audio') refs.audioUrl = url
      }

      const dataArr = await generate({
        mode,
        prompt,
        settings,
        refs,
        onProgress: setProgress
      })

      const entries = dataArr.map((data, i) => ({
        id: crypto.randomUUID(),
        createdAt: Date.now() + i,
        prompt,
        videoUrl: data.video.url,
        seed: data.seed,
        duration: settings.duration,
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        mode,
        variantOf: dataArr.length > 1 ? `${prompt.slice(0, 30)}` : null
      }))

      recordUsage({ cost, mode, variants: entries.length })
      setMonthlySpend(getMonthlySpend())

      let nextHistory = history
      entries.forEach((e) => { nextHistory = addToHistory(e) })
      setHistory(nextHistory)

      if (entries.length === 1) {
        setCurrentVideo(entries[0])
        setVariants(null)
      } else {
        setVariants(entries)
        setCurrentVideo(null)
      }
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleGenerate = () => {
    const overBudget = settings.budgetMonthly > 0 && monthlySpend + cost > settings.budgetMonthly
    const expensive = cost > settings.warnAbove

    if (overBudget) {
      setPendingConfirm({
        title: 'Over monthly budget',
        message: `This will push you to $${(monthlySpend + cost).toFixed(2)} this month, above your $${settings.budgetMonthly} cap. Continue anyway?`,
        confirmLabel: 'Generate anyway',
        danger: true,
        onConfirm: () => { setPendingConfirm(null); startGeneration() }
      })
      return
    }
    if (expensive) {
      setPendingConfirm({
        title: 'Expensive generation',
        message: `Estimated cost is $${cost.toFixed(3)}. Continue?`,
        confirmLabel: 'Generate',
        danger: false,
        onConfirm: () => { setPendingConfirm(null); startGeneration() }
      })
      return
    }
    startGeneration()
  }

  const handleLogout = () => {
    setPendingConfirm({
      title: 'Disconnect API key',
      message: 'You will be signed out and will need to paste your fal.ai API key again next time.',
      confirmLabel: 'Disconnect',
      danger: true,
      onConfirm: () => {
        clearApiKey()
        setHasKey(false)
        setPendingConfirm(null)
      }
    })
  }

  const handleClearHistory = () => {
    setPendingConfirm({
      title: 'Clear history',
      message: 'Remove all generations from your local history? This does not delete the videos on fal.ai.',
      confirmLabel: 'Clear',
      danger: true,
      onConfirm: () => {
        clearHistory()
        setHistory([])
        setPendingConfirm(null)
      }
    })
  }

  const handleRemoveHistory = (id) => setHistory(removeFromHistory(id))

  const handlePickHistory = (item) => {
    setCurrentVideo(item)
    setVariants(null)
    setOpenPanel(PANEL_NONE)
  }

  const handlePickVariant = (variant) => {
    setCurrentVideo(variant)
    setVariants(null)
  }

  if (!hasKey) {
    return <ApiKeySetup onSaved={() => setHasKey(true)} />
  }

  return (
    <div className="app">
      <Header
        onToggleHistory={() => togglePanel(PANEL_HISTORY)}
        onToggleSettings={() => togglePanel(PANEL_SETTINGS)}
        onToggleUsage={() => togglePanel(PANEL_USAGE)}
        onLogout={handleLogout}
        historyCount={history.length}
        monthlySpend={monthlySpend}
        budgetCap={settings.budgetMonthly}
      />

      <main className={`layout ${openPanel ? 'with-panel' : ''}`}>
        <section className="left-col">
          <PromptComposer
            prompt={prompt}
            setPrompt={setPrompt}
            mode={mode}
            setMode={setMode}
            refFile={refFile}
            setRefFile={setRefFile}
            variants={settings.variants}
            setVariants={(n) => setSettings({ ...settings, variants: n })}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            estimatedCost={cost}
            warnAbove={settings.warnAbove}
          />
          {error && <div className="error">{error}</div>}
        </section>

        <section className="right-col">
          <VideoStage
            video={currentVideo}
            variants={variants}
            isGenerating={isGenerating}
            progress={progress}
            onRegenerate={handleGenerate}
            onPickVariant={handlePickVariant}
          />
        </section>

        {openPanel === PANEL_SETTINGS && (
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onClose={() => setOpenPanel(PANEL_NONE)}
          />
        )}

        {openPanel === PANEL_HISTORY && (
          <HistoryPanel
            items={history}
            onClose={() => setOpenPanel(PANEL_NONE)}
            onPick={handlePickHistory}
            onClear={handleClearHistory}
            onRemove={handleRemoveHistory}
          />
        )}

        {openPanel === PANEL_USAGE && (
          <UsagePanel
            monthlySpend={monthlySpend}
            budgetCap={settings.budgetMonthly}
            onClose={() => setOpenPanel(PANEL_NONE)}
            onChanged={() => setMonthlySpend(getMonthlySpend())}
          />
        )}
      </main>

      <footer className="footer">
        <span>Powered by <a href="https://github.com/Lightricks/LTX-2" target="_blank" rel="noreferrer">LTX-2 19B</a> · open source · running on fal.ai</span>
      </footer>

      {pendingConfirm && (
        <ConfirmModal
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          confirmLabel={pendingConfirm.confirmLabel}
          danger={pendingConfirm.danger}
          onConfirm={pendingConfirm.onConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  )
}
