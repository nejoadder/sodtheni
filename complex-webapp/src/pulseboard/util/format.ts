export function formatRelative(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 15) return 'nyss'
  if (s < 60) return `${s}s sen`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m sen`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h sen`
  const d = Math.round(h / 24)
  return `${d}d sen`
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

