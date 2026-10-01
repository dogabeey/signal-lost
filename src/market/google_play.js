import { Capacitor, registerPlugin } from '@capacitor/core'
import { requireMarket } from './core.js'

// Native bridge supplied by capacitor-plugin-cdv-purchase. Using the bridge directly
// lets the backend own verification, consumption and acknowledgement.
const PurchasePlugin = registerPlugin('PurchasePlugin')

export function createGooglePlayProvider({ market, products, backendUrl, getAuthToken, native = PurchasePlugin, isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android', fetchImpl = globalThis.fetch, onEvent = () => {} }) {
  let initialized = false
  let initializing
  let accountId
  let processing = Promise.resolve()
  const listeners = []
  const emit = (event) => { try { onEvent(event) } catch {} }
  const request = async (path, body) => {
    requireMarket(typeof backendUrl === 'string' && new URL(backendUrl).protocol === 'https:' && typeof getAuthToken === 'function', 'VERIFICATION_NOT_CONFIGURED')
    const token = await getAuthToken()
    requireMarket(typeof token === 'string' && token.length > 0, 'AUTH_REQUIRED')
    const response = await fetchImpl(`${backendUrl.replace(/\/$/, '')}${path}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    })
    requireMarket(response.ok, 'VERIFICATION_FAILED')
    return response.json()
  }
  const fulfill = async (grant) => { await market.fulfillVerifiedGrant(grant); emit({ type: 'fulfilled', grantId: grant.id }) }
  const handle = ({ purchases = [] }) => {
    processing = processing.then(async () => {
      for (const purchase of purchases) {
        try {
          if (purchase.getPurchaseState !== 1) { emit({ type: 'pending' }); continue }
          const storeProductId = purchase.productIds?.[0] ?? purchase.productId
          if (!products.some((p) => p.payments.some((payment) => payment.provider === 'google-play' && payment.productId === storeProductId))) continue
          // Never trust orderId, amount, native quantity or rewards supplied by the client.
          const result = await request('/verify', { storeProductId, purchaseToken: purchase.purchaseToken ?? purchase.token })
          await fulfill(result.grant)
        } catch (error) { emit({ type: 'error', code: error.code ?? 'VERIFICATION_FAILED' }) }
      }
    }).catch((error) => emit({ type: 'error', code: error.code ?? 'VERIFICATION_FAILED' }))
  }
  const provider = {
    async initialize() {
      requireMarket(isAndroid(), 'PLATFORM_UNSUPPORTED')
      if (initialized) return
      if (initializing) return initializing
      initializing = (async () => {
        const session = await request('/session')
        requireMarket(typeof session.accountId === 'string' && /^[a-f0-9]{64}$/.test(session.accountId), 'INVALID_ACCOUNT')
        accountId = session.accountId
        try {
          listeners.push(await native.addListener('purchasesUpdated', handle))
          listeners.push(await native.addListener('setPurchases', handle))
          await native.init()
          const ids = products.flatMap((p) => p.enabled ? p.payments.filter((payment) => payment.provider === 'google-play').map((payment) => payment.productId) : [])
          if (ids.length) await native.getAvailableProducts({ inAppSkus: [...new Set(ids)], subsSkus: [] })
          initialized = true
        } catch (error) { await provider.dispose(); throw error }
      })()
      try { await initializing } finally { initializing = null }
    },
    async purchase(quote) {
      // Pack sizes are modeled as separate SKUs. One Play checkout per request.
      requireMarket(quote.quantity === 1, 'STORE_QUANTITY_UNSUPPORTED')
      await provider.initialize()
      await native.getAvailableProducts({ inAppSkus: [quote.payment.productId], subsSkus: [] })
      await native.buy({ productId: quote.payment.productId, additionalData: { accountId } })
      return { status: 'processing', productId: quote.productId }
    },
    async getPrices() {
      await provider.initialize()
      const ids = products.filter((p) => p.enabled).flatMap((p) => p.payments.filter((payment) => payment.provider === 'google-play').map((payment) => payment.productId))
      if (!ids.length) return []
      return (await native.getAvailableProducts({ inAppSkus: [...new Set(ids)], subsSkus: [] })).products
    },
    async restorePurchases() {
      await provider.initialize()
      // Consumed packs no longer appear in Play queries; the server retains their grants.
      const result = await request('/grants')
      for (const grant of result.grants) await fulfill(grant)
      await native.getPurchases() // Result arrives via setPurchases, not this promise.
      return { status: 'processing' }
    },
    async dispose() { for (const listener of listeners.splice(0)) await listener.remove(); initialized = false },
  }
  return provider
}
