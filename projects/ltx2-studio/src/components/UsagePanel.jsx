import { X, Trash2 } from 'lucide-react'
import { getDailyHistory, getTotalSpend, getTotalGenerations, clearUsage } from '../lib/usage'

export default function UsagePanel({ monthlySpend, budgetCap, onClose, onChanged }) {
  const daily = getDailyHistory(14)
  const max = Math.max(0.01, ...daily.map((d) => d.cost))
  const totalSpend = getTotalSpend()
  const totalGenerations = getTotalGenerations()
  const overBudget = budgetCap > 0 && monthlySpend > budgetCap

  const handleClear = () => {
    if (!confirm('Clear all usage data? This does not refund anything on fal.ai.')) return
    clearUsage()
    onChanged?.()
  }

  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>Usage & Budget</h2>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="panel-body">
        <div className="usage-card">
          <div className="usage-row">
            <span className="muted">This month</span>
            <strong className={overBudget ? 'danger-text' : ''}>${monthlySpend.toFixed(2)}</strong>
          </div>
          {budgetCap > 0 && (
            <>
              <div className="usage-row">
                <span className="muted">Budget cap</span>
                <span>${budgetCap.toFixed(2)}</span>
              </div>
              <div className="usage-bar">
                <div
                  className={`usage-bar-fill ${overBudget ? 'over' : ''}`}
                  style={{ width: `${Math.min(100, (monthlySpend / budgetCap) * 100)}%` }}
                />
              </div>
              {overBudget && (
                <div className="warn-banner">
                  Over budget by ${(monthlySpend - budgetCap).toFixed(2)}
                </div>
              )}
            </>
          )}
        </div>

        <h3 className="section-title">Last 14 days</h3>
        <div className="chart">
          {daily.map((d, i) => (
            <div key={i} className="chart-col" title={`${d.label}: $${d.cost.toFixed(3)}`}>
              <div
                className="chart-bar"
                style={{ height: `${(d.cost / max) * 100}%` }}
              />
              <div className="chart-label">{d.label.split(' ')[1]}</div>
            </div>
          ))}
        </div>

        <h3 className="section-title">All time</h3>
        <div className="usage-card">
          <div className="usage-row">
            <span className="muted">Total spend</span>
            <strong>${totalSpend.toFixed(2)}</strong>
          </div>
          <div className="usage-row">
            <span className="muted">Generations</span>
            <strong>{totalGenerations}</strong>
          </div>
          <div className="usage-row">
            <span className="muted">Avg / gen</span>
            <strong>${totalGenerations > 0 ? (totalSpend / totalGenerations).toFixed(3) : '0.000'}</strong>
          </div>
        </div>

        <button className="link-btn danger" onClick={handleClear} style={{ marginTop: 16 }}>
          <Trash2 size={12} /> Clear usage data
        </button>
      </div>
    </aside>
  )
}
