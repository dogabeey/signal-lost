import { createServer } from 'node:http'
import { OAuth2Client } from 'google-auth-library'
import { MARKET_PRODUCTS } from '../../src/market/catalog.js'
import { createPurchaseStore } from './sqlite_store.js'
import { accountIdFor, createGooglePlayVerifier } from './google_play_verifier.js'

// Start behind an HTTPS reverse proxy. Fails closed without identity/configuration.
const audience = process.env.MARKET_GOOGLE_CLIENT_ID
const dbPath = process.env.MARKET_DATABASE_PATH
const packageName = process.env.MARKET_ANDROID_PACKAGE
const origins = (process.env.MARKET_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
if (!audience || !dbPath || !packageName || !origins.length) throw new Error('Configure MARKET_GOOGLE_CLIENT_ID, MARKET_DATABASE_PATH, MARKET_ANDROID_PACKAGE and MARKET_ALLOWED_ORIGINS')
const identity = new OAuth2Client(audience)
const store = createPurchaseStore(dbPath)
const verifier = createGooglePlayVerifier({ packageName, products: MARKET_PRODUCTS, store })

createServer(async (request, response) => {
  const origin = request.headers.origin
  if (origin && !origins.includes(origin)) { response.writeHead(403).end(); return }
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { ...headers, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' }).end(); return
  }
  try {
    const bearer = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!bearer) { response.writeHead(401, headers).end(JSON.stringify({ error: 'AUTH_REQUIRED' })); return }
    const ticket = await identity.verifyIdToken({ idToken: bearer, audience })
    const userId = ticket.getPayload()?.sub
    if (!userId) throw new Error('Invalid identity')
    let data
    if (request.method === 'GET' && request.url === '/session') data = { accountId: accountIdFor(userId) }
    else if (request.method === 'GET' && request.url === '/grants') data = { grants: await verifier.grants(userId) }
    else if (request.method === 'POST' && request.url === '/verify') {
      let body = ''
      for await (const chunk of request) {
        body += chunk.toString('utf8')
        if (Buffer.byteLength(body) > 16384) { response.writeHead(413, headers).end(); return }
      }
      const receipt = JSON.parse(body)
      data = { grant: await verifier.verify({ userId, storeProductId: receipt.storeProductId, purchaseToken: receipt.purchaseToken }) }
    } else { response.writeHead(404, headers).end(); return }
    response.writeHead(200, headers).end(JSON.stringify(data))
  } catch (error) {
    // Do not leak tokens, Google responses or credentials to clients/logs.
    response.writeHead(400, headers).end(JSON.stringify({ error: error.code && typeof error.code === 'string' ? error.code : 'REQUEST_REJECTED' }))
  }
}).listen(Number(process.env.MARKET_PORT ?? 8787), '127.0.0.1')
