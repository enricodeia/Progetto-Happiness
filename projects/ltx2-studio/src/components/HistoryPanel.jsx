import { X, Trash2, Download, Play } from 'lucide-react'

export default function HistoryPanel({ items, onClose, onPick, onClear, onRemove }) {
  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>History</h2>
        <div className="row gap">
          {items.length > 0 && (
            <button className="icon-btn" onClick={onClear} title="Clear all">
              <Trash2 size={16} />
            </button>
          )}
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="panel-body">
        {items.length === 0 && (
          <div className="empty">
            <p>No generations yet.</p>
            <p className="empty-sub">Your videos will appear here.</p>
          </div>
        )}

        <div className="history-list">
          {items.map((it) => (
            <div key={it.id} className="history-item">
              <button className="history-thumb" onClick={() => onPick(it)}>
                <video src={it.videoUrl} muted playsInline preload="metadata" />
                <div className="history-play"><Play size={18} fill="currentColor" /></div>
              </button>
              <div className="history-meta">
                <div className="history-prompt">{it.prompt}</div>
                <div className="history-info">
                  {new Date(it.createdAt).toLocaleString()} · {it.duration}s · {it.aspectRatio}
                </div>
                <div className="row gap">
                  <a
                    className="link-btn"
                    href={it.videoUrl}
                    download={`ltx2-${it.id}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={12} /> Download
                  </a>
                  <button className="link-btn danger" onClick={() => onRemove(it.id)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
