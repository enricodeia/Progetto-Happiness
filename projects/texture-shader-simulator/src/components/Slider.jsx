import { useEffect, useRef, useState } from 'react';

// Slider with a click-to-edit numeric value display.
// The range slider is bounded by [min, max] for tactile control, but the
// numeric editor accepts ANY value — including values outside that range —
// so power-users can push parameters past their soft limits.
const Slider = ({ label, value, min, max, step = 0.01, onChange, format }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const display = format
    ? format(value)
    : typeof value === 'number'
      ? value.toFixed(2)
      : value;

  const beginEdit = () => {
    setDraft(typeof value === 'number' ? String(value) : value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const trimmed = String(draft).trim();
    if (trimmed === '') return;
    const n = parseFloat(trimmed);
    if (!Number.isNaN(n)) onChange(n);
  };

  const cancel = () => setEditing(false);

  const beyond = typeof value === 'number' && (value > max || value < min);

  return (
    <label className="slider">
      <div className="slider__header">
        <span className="slider__label">{label}</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            className="slider__value-input"
            step={step}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') cancel();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className={`slider__value${beyond ? ' slider__value--beyond' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginEdit();
            }}
            title="Click to type any value"
          >
            {display}
          </button>
        )}
      </div>
      <input
        type="range"
        className="slider__input"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
};

export default Slider;
