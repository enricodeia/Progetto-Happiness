import { Settings, History, LogOut, Activity } from 'lucide-react'

export default function Header({
  onToggleHistory,
  onToggleSettings,
  onToggleUsage,
  onLogout,
  historyCount,
  monthlySpend,
  budgetCap
}) {
  const overBudget = budgetCap > 0 && monthlySpend > budgetCap
  const pct = budgetCap > 0 ? Math.min(100, (monthlySpend / budgetCap) * 100) : 0

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#a78bfa"/>
                <stop offset="1" stopColor="#ec4899"/>
              </linearGradient>
            </defs>
            <path d="M11 10v12l10-6z" fill="url(#hg)"/>
          </svg>
        </div>
        <div>
          <div className="brand-title">LTX-2 Studio</div>
          <div className="brand-sub">Open-source AI video</div>
        </div>
      </div>

      <div className="header-actions">
        <button
          className={`spend-pill ${overBudget ? 'danger' : ''}`}
          onClick={onToggleUsage}
          title="Usage and budget"
        >
          <Activity size={12} />
          <span>${monthlySpend.toFixed(2)}</span>
          {budgetCap > 0 && (
            <span className="spend-meta">/ ${budgetCap.toFixed(0)}</span>
          )}
          {budgetCap > 0 && (
            <span className="spend-bar" style={{ '--pct': `${pct}%` }} />
          )}
        </button>
        <button className="icon-btn" onClick={onToggleHistory} title="History">
          <History size={16} />
          {historyCount > 0 && <span className="dot">{historyCount}</span>}
        </button>
        <button className="icon-btn" onClick={onToggleSettings} title="Settings">
          <Settings size={16} />
        </button>
        <button className="icon-btn" onClick={onLogout} title="Disconnect">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
