import './HelpModal.css';

const SHORTCUTS = [
  { keys: ['Space'], label: 'Play / pause animation' },
  { keys: ['R'], label: 'Randomize shader + colors' },
  { keys: ['⇧', 'R'], label: 'Reset material + gen params' },
  { keys: ['C'], label: 'Copy shader code (in Shader tab)' },
  { keys: ['E'], label: 'Open export modal' },
  { keys: ['F'], label: 'Fullscreen preview' },
  { keys: ['/'], label: 'Focus shader search' },
  { keys: ['⌘', 'Z'], label: 'Undo shader change' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['1'], label: 'Source: preset' },
  { keys: ['2'], label: 'Source: image' },
  { keys: ['3'], label: 'Source: shader' },
  { keys: ['4'], label: 'Source: GLB model' },
  { keys: ['drop'], label: 'Drop image/.glb anywhere' }
];

const HelpModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="help-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="help-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="help-modal__header">
          <div>
            <h3 className="help-modal__title">Keyboard shortcuts</h3>
            <p className="help-modal__subtitle">
              Faster than reaching for the mouse.
            </p>
          </div>
          <button className="help-modal__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <ul className="help-modal__list">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="help-modal__row">
              <span className="help-modal__keys">
                {s.keys.map((k, i) => (
                  <kbd key={i} className="help-modal__kbd">{k}</kbd>
                ))}
              </span>
              <span className="help-modal__label">{s.label}</span>
            </li>
          ))}
        </ul>

        <footer className="help-modal__footer">
          Pro tip: with animation playing, open the Shader tab and toggle the
          pulsing <kbd className="help-modal__kbd">~</kbd> button next to any
          param to animate it.
        </footer>
      </div>
    </div>
  );
};

export default HelpModal;
