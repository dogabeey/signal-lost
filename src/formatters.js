export function formatResearchEffect(research, level) {
  if (!research.effect) return level > 0 ? 'UNLOCKED' : 'LOCKED'
  const effect = level * research.effect.perLevel
  return research.effect.format === 'percent' ? `+${(effect * 100).toFixed(effect * 100 % 1 ? 1 : 0)}%` : String(effect)
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function formatCompactNumber(value) {
  const absoluteValue = Math.abs(value)
  const unit = absoluteValue >= 1e12 ? ['T', 1e12] : absoluteValue >= 1e9 ? ['B', 1e9] : absoluteValue >= 1e6 ? ['M', 1e6] : absoluteValue >= 1e3 ? ['K', 1e3] : null
  if (!unit) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const scaled = value / unit[1]
  return `${scaled.toFixed(Math.abs(scaled) < 10 ? 2 : 1)}${unit[0]}`
}

export function formatCurrency(currency, amount) {
  return currency === 'cash' ? `$${formatCompactNumber(amount)}` : `✦ ${formatCompactNumber(amount)}`
}
