import { useState } from 'react'
import { Download, Share2, RefreshCw, Film, Star } from 'lucide-react'

const Loader = ({ progress }) => {
  const lastLog = progress?.logs?.[progress.logs.length - 1]
  const v = progress?.totalVariants > 1 ? ` (variant ${progress.variantIndex + 1}/${progress.totalVariants})` : ''
  return (
    <div className="stage loading">
      <div className="loader-orb" />
      <div className="loader-status">
        {progress?.status === 'IN_QUEUE'
          ? `In queue${progress?.position != null ? ` #${progress.position}` : ''}…${v}`
          : `Generating with LTX-2 19B${v}`}
      </div>
      {lastLog && <div className="loader-log">{lastLog}</div>}
      <div className="loader-hint">
        Each variant takes 1-3 minutes. Variants render in parallel.
      </div>
    </div>
  )
}

const Empty = () => (
  <div className="stage empty-stage">
    <Film size={40} strokeWidth={1.2} />
    <div className="stage-title">Your video will appear here</div>
    <div className="stage-sub">Write a prompt and hit generate.</div>
  </div>
)

const SingleVideo = ({ video, onRegenerate }) => (
  <div className="stage">
    <div className="video-frame">
      <video src={video.videoUrl} controls autoPlay loop playsInline className="video-el" />
    </div>
    <div className="video-info">
      <div className="video-prompt">{video.prompt}</div>
      <div className="video-meta">
        {video.aspectRatio} · {video.duration}s · seed {video.seed ?? '—'} · {video.mode}
      </div>
    </div>
    <div className="video-actions">
      <a className="btn-secondary" href={video.videoUrl} download={`ltx2-${video.id}.mp4`} target="_blank" rel="noreferrer">
        <Download size={14} /> Download
      </a>
      <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(video.videoUrl)}>
        <Share2 size={14} /> Copy URL
      </button>
      <button className="btn-secondary" onClick={onRegenerate}>
        <RefreshCw size={14} /> Regenerate
      </button>
    </div>
  </div>
)

const VariantsGrid = ({ variants, onPickVariant }) => {
  const [active, setActive] = useState(0)
  const v = variants[active]
  return (
    <div className="stage">
      <div className="video-frame">
        <video key={v.id} src={v.videoUrl} controls autoPlay loop playsInline className="video-el" />
      </div>

      <div className="variants-strip">
        {variants.map((variant, i) => (
          <button
            key={variant.id}
            className={`variant-thumb ${active === i ? 'active' : ''}`}
            onClick={() => setActive(i)}
            title={`Variant ${i + 1} · seed ${variant.seed ?? '—'}`}
          >
            <video src={variant.videoUrl} muted playsInline preload="metadata" />
            <div className="variant-num">{i + 1}</div>
          </button>
        ))}
      </div>

      <div className="video-info">
        <div className="video-prompt">{v.prompt}</div>
        <div className="video-meta">
          {v.aspectRatio} · {v.duration}s · seed {v.seed ?? '—'} · {v.mode}
        </div>
      </div>

      <div className="video-actions">
        <button className="btn-primary" onClick={() => onPickVariant(v)}>
          <Star size={14} /> Pick this variant
        </button>
        <a className="btn-secondary" href={v.videoUrl} download={`ltx2-${v.id}.mp4`} target="_blank" rel="noreferrer">
          <Download size={14} /> Download
        </a>
        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(v.videoUrl)}>
          <Share2 size={14} /> Copy URL
        </button>
      </div>
    </div>
  )
}

export default function VideoStage({ video, variants, isGenerating, progress, onRegenerate, onPickVariant }) {
  if (isGenerating) return <Loader progress={progress} />
  if (variants && variants.length > 1) return <VariantsGrid variants={variants} onPickVariant={onPickVariant} />
  if (video) return <SingleVideo video={video} onRegenerate={onRegenerate} />
  return <Empty />
}
