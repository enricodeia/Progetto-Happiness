import { useRef, useState } from 'react'
import { Sparkles, Image as ImageIcon, Video, Music, X, Loader2, Wand2, Copy } from 'lucide-react'

const MODES = [
  { v: 'text',  label: 'Text',  icon: Sparkles, accept: null },
  { v: 'image', label: 'Image', icon: ImageIcon, accept: 'image/*' },
  { v: 'video', label: 'Video', icon: Video, accept: 'video/*' },
  { v: 'audio', label: 'Audio', icon: Music, accept: 'audio/*' }
]

const PRESETS = [
  'A cinematic shot of a lone astronaut walking on a red desert planet at sunset, dust particles in the air, anamorphic lens flare, 35mm film grain.',
  'Aerial drone footage flying over snow-capped mountains at golden hour, soft volumetric clouds, cinematic color grade.',
  'A neon-lit cyberpunk alley in Tokyo at night, rain reflecting on the asphalt, holographic signs flickering, slow camera dolly forward.',
  'Macro shot of a hummingbird drinking nectar from a tropical flower, slow motion, lush jungle background, golden light.',
  'A vintage 1960s sports car driving through a coastal road at dawn, pastel sky, smooth tracking shot from the side.',
  'A bonsai tree growing time-lapse from seed to mature tree, studio lighting on neutral background, hyperreal detail.',
  'Underwater shot of a humpback whale gliding past the camera, sun rays piercing the surface, deep blue gradient.'
]

const VARIANTS = [1, 2, 3, 4]

export default function PromptComposer({
  prompt,
  setPrompt,
  mode,
  setMode,
  refFile,
  setRefFile,
  variants,
  setVariants,
  onGenerate,
  isGenerating,
  estimatedCost,
  warnAbove
}) {
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const currentMode = MODES.find((m) => m.v === mode) || MODES[0]
  const needsRef = mode !== 'text'
  const isVideoRef = mode === 'video'
  const isAudioRef = mode === 'audio'
  const isImageRef = mode === 'image'

  const handleFile = (file) => {
    if (!file) return
    setRefFile(file)
    if (isAudioRef) {
      setPreview({ type: 'audio', name: file.name })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setPreview({ type: isVideoRef ? 'video' : 'image', url: e.target.result, name: file.name })
    reader.readAsDataURL(file)
  }

  const clearRef = () => {
    setRefFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (currentMode.accept) {
      const type = currentMode.accept.split('/')[0]
      if (!f.type.startsWith(type)) return
    }
    handleFile(f)
  }

  const pickPreset = () => {
    const r = PRESETS[Math.floor(Math.random() * PRESETS.length)]
    setPrompt(r)
  }

  const switchMode = (next) => {
    if (next !== mode) {
      clearRef()
      setMode(next)
    }
  }

  const exceedsWarning = estimatedCost > warnAbove

  return (
    <div className="composer">
      <div className="mode-tabs">
        {MODES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.v}
              className={`mode-tab ${mode === m.v ? 'active' : ''}`}
              onClick={() => switchMode(m.v)}
              disabled={isGenerating}
            >
              <Icon size={14} /> {m.label}
            </button>
          )
        })}
      </div>

      {needsRef && (
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''} ${preview ? 'has-preview' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          {preview ? (
            <div className="ref-preview">
              {preview.type === 'image' && <img src={preview.url} alt="" />}
              {preview.type === 'video' && <video src={preview.url} muted playsInline controls />}
              {preview.type === 'audio' && (
                <div className="audio-tag">
                  <Music size={20} />
                  <div className="audio-name">{preview.name}</div>
                </div>
              )}
              <button className="remove-img" onClick={clearRef} disabled={isGenerating}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              className="upload-btn"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              {isImageRef && <ImageIcon size={20} />}
              {isVideoRef && <Video size={20} />}
              {isAudioRef && <Music size={20} />}
              <div>
                <div className="upload-title">
                  Drop {isImageRef ? 'image' : isVideoRef ? 'video' : 'audio'} here, or click to upload
                </div>
                <div className="upload-sub">
                  {isImageRef && 'PNG, JPG, WebP'}
                  {isVideoRef && 'MP4, MOV, WebM'}
                  {isAudioRef && 'MP3, WAV, M4A'}
                </div>
              </div>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={currentMode.accept}
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      <div className="prompt-wrap">
        <textarea
          className="prompt-input"
          placeholder={
            mode === 'text'
              ? 'Describe the video you want to generate…'
              : mode === 'image'
              ? 'Describe the motion and scene that brings the image to life…'
              : mode === 'video'
              ? 'Describe how the video should be transformed…'
              : 'Describe the visuals that match this audio…'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={isGenerating}
        />
        <div className="prompt-tools">
          <button className="preset-btn" onClick={pickPreset} type="button">
            <Wand2 size={14} /> Inspire me
          </button>
          {prompt && (
            <button
              className="preset-btn"
              onClick={() => navigator.clipboard.writeText(prompt)}
              type="button"
              title="Copy prompt"
            >
              <Copy size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="row between">
        <div className="variants-pick">
          <span className="muted">Variants</span>
          <div className="seg compact">
            {VARIANTS.map((n) => (
              <button
                key={n}
                className={`seg-btn ${variants === n ? 'active' : ''}`}
                onClick={() => setVariants(n)}
                disabled={isGenerating}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="generate-row">
        <div className="cost">
          Est. cost: <strong>${estimatedCost.toFixed(3)}</strong>
          {exceedsWarning && <span className="warn-pill">High</span>}
        </div>
        <button
          className="btn-primary big"
          onClick={onGenerate}
          disabled={
            isGenerating ||
            !prompt.trim() ||
            (needsRef && !refFile)
          }
        >
          {isGenerating ? (
            <><Loader2 size={16} className="spin" /> Generating…</>
          ) : (
            <><Sparkles size={16} /> Generate {variants > 1 ? `${variants} variants` : 'Video'}</>
          )}
        </button>
      </div>
    </div>
  )
}
