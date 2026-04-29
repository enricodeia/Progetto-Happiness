import { useMemo, useState, useEffect } from 'react';
import {
  downloadAllMaps,
  downloadMap,
  buildThreeSnippet,
  buildR3FSnippet,
  buildJSONManifest
} from '../../utils/exporter.js';
import { buildLiveShaderSnippet } from '../../utils/runtimeExporter.js';
import './ExportModal.css';

const TABS = [
  { id: 'live', label: 'Live shader (no PNGs)' },
  { id: 'r3f', label: 'React Three Fiber' },
  { id: 'three', label: 'three.js' },
  { id: 'manifest', label: 'JSON' }
];

const ExportModal = ({ open, onClose, maps, material, gen, sourceName, shader }) => {
  const [tab, setTab] = useState('live');
  const [prefix, setPrefix] = useState('texture');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const snippets = useMemo(() => {
    const params = {
      ...gen,
      ...material // roughness/metalness/normalScale/bumpScale/displacementScale + all physical fields
    };
    return {
      live: buildLiveShaderSnippet({ shader: shader || {}, gen, material, prefix }),
      r3f: buildR3FSnippet({ prefix, params }),
      three: buildThreeSnippet({ prefix, params }),
      manifest: buildJSONManifest({ prefix, params, source: sourceName || prefix })
    };
  }, [shader, gen, material, prefix, sourceName]);

  if (!open) return null;

  const current = snippets[tab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const handleDownloadSnippet = () => {
    const ext = tab === 'manifest' ? 'json' : tab === 'r3f' ? 'jsx' : 'js';
    const filename = `${prefix}_${tab}.${ext}`;
    const blob = new Blob([current], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="export-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="export-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="export-modal__header">
          <div>
            <h3 className="export-modal__title">Export texture</h3>
            <p className="export-modal__subtitle">
              Hand the PNGs + snippet to another agent and it has everything to render
              this material.
            </p>
          </div>
          <button className="export-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <section className="export-modal__section">
          <label className="export-modal__field">
            <span className="export-modal__field-label">Texture name</span>
            <input
              className="export-modal__input"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z0-9_]/g, '') || 'texture')}
            />
          </label>
        </section>

        <section className="export-modal__section">
          <div className="export-modal__section-label">Download PNGs</div>
          <div className="export-modal__download-grid">
            <button
              className="export-modal__btn export-modal__btn--primary"
              onClick={() => downloadAllMaps(maps, prefix)}
            >
              Download all
            </button>
            {maps &&
              Object.entries(maps).map(([key, img]) =>
                img ? (
                  <button
                    key={key}
                    className="export-modal__btn"
                    onClick={() => downloadMap(img, `${prefix}_${key}`)}
                  >
                    {key}.png
                  </button>
                ) : null
              )}
          </div>
        </section>

        <section className="export-modal__section">
          <div className="export-modal__tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`export-modal__tab${tab === t.id ? ' export-modal__tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
            <button
              className="export-modal__copy"
              onClick={handleDownloadSnippet}
              title="Download snippet as a file"
            >
              ⬇ Download
            </button>
            <button
              className="export-modal__copy"
              onClick={handleCopy}
              title="Copy snippet to clipboard"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="export-modal__code">
            <code>{current}</code>
          </pre>
        </section>
      </div>
    </div>
  );
};

export default ExportModal;
