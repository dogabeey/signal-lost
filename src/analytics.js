import { ANALYTICS_CONFIG } from './analytics_config.js'

const SESSION_ID_KEY = 'asteroid-belt-analytics-session-id'

function getAnonymousSessionId() {
  try {
    const storedId = sessionStorage.getItem(SESSION_ID_KEY)
    if (storedId) return storedId
    const sessionId = crypto.randomUUID()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    return sessionId
  } catch {
    return crypto.randomUUID()
  }
}

export function trackSectorStarted({ sector, buildVersion, platform }) {
  if (!ANALYTICS_CONFIG.endpoint) return
  fetch(ANALYTICS_CONFIG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'sector_started',
      sessionId: getAnonymousSessionId(),
      properties: { sector, buildVersion, platform },
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt a run when the collector is unavailable.
  })
}
