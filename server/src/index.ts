import { defineServer } from 'colyseus'
import express from 'express'
import { posthog } from './posthog.js'

const port = Number(process.env.PORT ?? 2567)
const allowedOrigins = new Set(
  (process.env.ANALYTICS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const recentEvents = new Map<string, number>()
const eventCooldownMs = 1_000

type SectorStartedPayload = {
  event: 'sector_started'
  sessionId: string
  properties: {
    sector: number
    buildVersion: string
    platform: 'web' | 'steam'
  }
}

function isSectorStartedPayload(value: unknown): value is SectorStartedPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<SectorStartedPayload>
  const properties = payload.properties as Partial<SectorStartedPayload['properties']> | undefined
  return payload.event === 'sector_started'
    && typeof payload.sessionId === 'string'
    && /^[a-zA-Z0-9_-]{16,128}$/.test(payload.sessionId)
    && typeof properties?.sector === 'number'
    && Number.isInteger(properties.sector)
    && properties.sector >= 1
    && properties.sector <= 8
    && typeof properties.buildVersion === 'string'
    && properties.buildVersion.length <= 32
    && (properties.platform === 'web' || properties.platform === 'steam')
}

// Multiplayer is intentionally not exposed in the game client yet. This is the
// deployable server foundation where rooms, authentication and analytics can be
// added later without coupling them to the browser build.
const server = defineServer({
  rooms: {},
  express: (app) => {
    app.use(express.json({ limit: '4kb' }))
    app.use((request, response, next) => {
      const origin = request.headers.origin
      if (origin && !allowedOrigins.has(origin)) return response.sendStatus(403)
      if (origin) response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Vary', 'Origin')
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (request.method === 'OPTIONS') return response.sendStatus(204)
      next()
    })
    app.get('/health', (_request, response) => response.json({ ok: true }))
    app.get('/time', (_request, response) => {
      response.setHeader('Cache-Control', 'no-store')
      response.json({ now: new Date().toISOString() })
    })
    app.post('/analytics/event', (request, response) => {
      if (!posthog) return response.sendStatus(503)
      if (!isSectorStartedPayload(request.body)) return response.sendStatus(400)
      const now = Date.now()
      const lastEventAt = recentEvents.get(request.body.sessionId) ?? 0
      if (now - lastEventAt < eventCooldownMs) return response.sendStatus(429)
      recentEvents.set(request.body.sessionId, now)
      posthog.capture({
        distinctId: request.body.sessionId,
        event: request.body.event,
        properties: request.body.properties,
      })
      response.sendStatus(202)
    })
  },
})

server.onShutdown(() => posthog?.shutdown())
server.listen(port)
console.log(`Asteroid Belt multiplayer foundation listening on ws://localhost:${port}`)
