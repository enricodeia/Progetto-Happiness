import { useCallback, useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ toasts, onDismiss }) => {
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => onDismiss(t.id), t.duration ?? 2400)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind ?? 'info'}`}
          onClick={() => onDismiss(t.id)}
        >
          {t.icon && <span className="toast__icon">{t.icon}</span>}
          <span className="toast__text">{t.text}</span>
        </div>
      ))}
    </div>
  );
};

export const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, text, ...opts }]);
  }, []);
  const dismiss = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );
  return { toasts, push, dismiss };
};

export default Toast;
