const KEY = 'ltx2_usage'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

const write = (entries) => {
  const trimmed = entries.slice(-500)
  localStorage.setItem(KEY, JSON.stringify(trimmed))
}

export const recordUsage = ({ cost, mode, variants = 1 }) => {
  const entries = read()
  entries.push({
    ts: Date.now(),
    cost: Number(cost) || 0,
    mode,
    variants
  })
  write(entries)
  return entries
}

export const getUsage = () => read()

export const clearUsage = () => localStorage.removeItem(KEY)

const startOfMonth = () => {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const startOfDay = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const getMonthlySpend = () => {
  const since = startOfMonth()
  return read().filter((e) => e.ts >= since).reduce((s, e) => s + e.cost, 0)
}

export const getDailySpend = () => {
  const since = startOfDay()
  return read().filter((e) => e.ts >= since).reduce((s, e) => s + e.cost, 0)
}

export const getDailyHistory = (days = 14) => {
  const entries = read()
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const start = startOfDay(i)
    const end = start + 86_400_000
    const cost = entries.filter((e) => e.ts >= start && e.ts < end).reduce((s, e) => s + e.cost, 0)
    const date = new Date(start)
    buckets.push({
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      cost
    })
  }
  return buckets
}

export const getTotalSpend = () => read().reduce((s, e) => s + e.cost, 0)

export const getTotalGenerations = () => read().length
