import { X, Plus, Trash2, Zap } from 'lucide-react'

const RESOLUTIONS = ['720p', '1080p', '4k']
const RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4']
const DURATIONS = [3, 5, 6, 8, 10]
const CAMERAS = [
  { v: 'none', label: 'None' },
  { v: 'static', label: 'Static' },
  { v: 'dolly_in', label: 'Dolly in' },
  { v: 'dolly_out', label: 'Dolly out' },
  { v: 'dolly_left', label: 'Pan left' },
  { v: 'dolly_right', label: 'Pan right' },
  { v: 'jib_up', label: 'Jib up' },
  { v: 'jib_down', label: 'Jib down' }
]

export default function SettingsPanel({ settings, onChange, onClose }) {
  const set = (k, v) => onChange({ ...settings, [k]: v })

  const addLora = () => {
    const next = [...(settings.loras || []), { path: '', scale: 1 }]
    set('loras', next)
  }

  const updateLora = (i, patch) => {
    const next = (settings.loras || []).map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    set('loras', next)
  }

  const removeLora = (i) => {
    const next = (settings.loras || []).filter((_, idx) => idx !== i)
    set('loras', next)
  }

  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>Settings</h2>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="panel-body">
        <div className="field">
          <label>Resolution</label>
          <div className="seg">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                className={`seg-btn ${settings.resolution === r ? 'active' : ''}`}
                onClick={() => set('resolution', r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Aspect ratio</label>
          <div className="seg">
            {RATIOS.map((r) => (
              <button
                key={r}
                className={`seg-btn ${settings.aspectRatio === r ? 'active' : ''}`}
                onClick={() => set('aspectRatio', r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Duration ({settings.duration}s)</label>
          <div className="seg">
            {DURATIONS.map((d) => (
              <button
                key={d}
                className={`seg-btn ${settings.duration === d ? 'active' : ''}`}
                onClick={() => set('duration', d)}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Camera motion</label>
          <select
            className="select"
            value={settings.cameraMotion || 'none'}
            onChange={(e) => set('cameraMotion', e.target.value)}
          >
            {CAMERAS.map((c) => (
              <option key={c.v} value={c.v}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Seed (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="Random per variant"
            value={settings.seed}
            onChange={(e) => set('seed', e.target.value)}
          />
        </div>

        <div className="field">
          <label>Negative prompt (optional)</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="What to avoid…"
            value={settings.negativePrompt || ''}
            onChange={(e) => set('negativePrompt', e.target.value)}
          />
        </div>

        <div className="toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.generateAudio}
              onChange={(e) => set('generateAudio', e.target.checked)}
            />
            <span>Generate audio</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.enhancePrompt}
              onChange={(e) => set('enhancePrompt', e.target.checked)}
            />
            <span>Enhance prompt</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!settings.distilled}
              onChange={(e) => set('distilled', e.target.checked)}
            />
            <span><Zap size={12} /> Distilled (faster, ~50% cheaper)</span>
          </label>
        </div>

        <div className="divider" />

        <div className="field">
          <div className="row between">
            <label>Custom LoRAs</label>
            <button className="link-btn" onClick={addLora} type="button">
              <Plus size={12} /> Add
            </button>
          </div>
          {(settings.loras || []).length === 0 && (
            <p className="muted small">
              Paste a LoRA URL (HuggingFace, Civitai, etc.) to control style or character.
            </p>
          )}
          {(settings.loras || []).map((lora, i) => (
            <div key={i} className="lora-row">
              <input
                type="text"
                className="input"
                placeholder="https://… or huggingface/repo"
                value={lora.path}
                onChange={(e) => updateLora(i, { path: e.target.value })}
              />
              <div className="lora-controls">
                <input
                  type="number"
                  className="input narrow"
                  step="0.05"
                  min="0"
                  max="2"
                  value={lora.scale}
                  onChange={(e) => updateLora(i, { scale: Number(e.target.value) })}
                />
                <button className="icon-btn" onClick={() => removeLora(i)} title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <div className="field">
          <label>Monthly budget cap (USD)</label>
          <input
            type="number"
            className="input"
            min="0"
            step="1"
            value={settings.budgetMonthly}
            onChange={(e) => set('budgetMonthly', Number(e.target.value) || 0)}
          />
          <p className="muted small">Soft cap. You'll be warned when you exceed it.</p>
        </div>

        <div className="field">
          <label>Warn above per generation (USD)</label>
          <input
            type="number"
            className="input"
            min="0"
            step="0.05"
            value={settings.warnAbove}
            onChange={(e) => set('warnAbove', Number(e.target.value) || 0)}
          />
        </div>
      </div>
    </aside>
  )
}
