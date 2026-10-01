import { createHash } from 'node:crypto'
import { GoogleAuth } from 'google-auth-library'
import { requireMarket, positiveInteger } from '../../src/market/core.js'

export const accountIdFor = (userId) => createHash('sha256').update(userId).digest('hex')

export function createGooglePlayVerifier({ packageName, products, store, google = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }) }) {
  requireMarket(packageName && store, 'SERVER_NOT_CONFIGURED')
  const api = async (path, method = 'GET', data) => {
    const client = await google.getClient()
    return (await client.request({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/${path}`, method, ...(data ? { data } : {}) })).data
  }
  const finalize = async (record) => {
    const path = `purchases/products/${encodeURIComponent(record.storeProductId)}/tokens/${encodeURIComponent(record.purchaseToken)}`
    const purchase = await api(path)
    requireMarket(purchase.purchaseState === 0, 'PURCHASE_NOT_COMPLETED')
    requireMarket(purchase.obfuscatedExternalAccountId === accountIdFor(record.userId), 'ACCOUNT_MISMATCH')
    if (record.consumable && purchase.consumptionState !== 1) await api(`${path}:consume`, 'POST')
    if (!record.consumable && purchase.acknowledgementState !== 1) await api(`${path}:acknowledge`, 'POST', {})
    store.markFinalized(record.id)
  }
  return {
    async verify({ userId, storeProductId, purchaseToken }) {
      requireMarket(typeof userId === 'string' && userId.length > 0 && typeof purchaseToken === 'string' && purchaseToken.length > 0 && purchaseToken.length <= 8192 && typeof storeProductId === 'string', 'INVALID_RECEIPT')
      const id = createHash('sha256').update(`${packageName}:${purchaseToken}`).digest('hex')
      const existing = store.get(id)
      if (existing) {
        requireMarket(existing.userId === userId && existing.storeProductId === storeProductId, 'RECEIPT_ALREADY_CLAIMED')
        await finalize(existing)
        return existing.grant
      }
      const product = products.find((p) => p.payments.some((payment) => payment.provider === 'google-play' && payment.productId === storeProductId))
      // Fulfill already-paid purchases even if a catalog item was disabled later.
      requireMarket(product, 'UNKNOWN_PRODUCT')
      const payment = product.payments.find((p) => p.provider === 'google-play' && p.productId === storeProductId)
      const purchase = await api(`purchases/products/${encodeURIComponent(storeProductId)}/tokens/${encodeURIComponent(purchaseToken)}`)
      requireMarket(purchase.purchaseState === 0 && purchase.consumptionState !== 1, 'PURCHASE_NOT_COMPLETED')
      requireMarket(purchase.obfuscatedExternalAccountId === accountIdFor(userId), 'ACCOUNT_MISMATCH')
      const quantity = purchase.quantity ?? 1
      requireMarket(positiveInteger(quantity) && (payment.consumable || quantity === 1), 'INVALID_QUANTITY')
      const grant = { id, provider: 'google-play', productId: product.id, storeProductId, quantity, rewards: structuredClone(product.rewards) }
      const record = { id, userId, storeProductId, purchaseToken, consumable: payment.consumable === true, grant, finalized: false }
      // Durable unique token ownership and reward record BEFORE acknowledge/consume.
      // putOnce is atomic; racing accounts must never receive the same token.
      const saved = store.putOnce(record)
      requireMarket(saved.userId === userId && saved.storeProductId === storeProductId, 'RECEIPT_ALREADY_CLAIMED')
      await finalize(saved)
      return saved.grant
    },
    async grants(userId) {
      const records = store.list(userId)
      // Retry interrupted finalization rather than forgetting purchased items.
      const activeGrants = []
      for (const record of records) {
        try { await finalize(record); activeGrants.push(record.grant) }
        catch (error) { if (error.code !== 'PURCHASE_NOT_COMPLETED') throw error }
      }
      return activeGrants
    },
  }
}
