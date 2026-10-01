import test from 'node:test'
import assert from 'node:assert/strict'
import { createMarket } from '../src/market/core.js'
import { createLocalMarketRepository, recoverMarketTransaction, MARKET_JOURNAL_KEY, hasMarketEntitlement } from '../src/market/repository.js'
import { createGameRewardHandlers } from '../src/market/rewards.js'

class MemoryStorage {
  data = new Map()
  failKey = null
  getItem(key) { return this.data.get(key) ?? null }
  setItem(key, value) { if (key === this.failKey) throw new Error('Disk full'); this.data.set(key, value) }
  removeItem(key) { this.data.delete(key) }
}
const artifacts = [{ id: 'core', repeatable: true }, { id: 'map', repeatable: false }]
const pack = {
  id: 'pack', enabled: true, categoryId: 'currency', maxQuantity: 10,
  rewards: [{ type: 'currency', currency: 'chronoshards', amount: 5 }],
  payments: ['cash', 'chronoshards', 'aetherium'].map((currency) => ({ id: currency, provider: 'wallet', currency, amount: 10 })),
}
function setup(products = [pack]) {
  const storage = new MemoryStorage()
  for (const currency of ['cash', 'chronoshards', 'aetherium']) storage.setItem(currency, '100')
  const repository = createLocalMarketRepository({ storage, currencyKeys: { cash: 'cash', chronoshards: 'chronoshards', aetherium: 'aetherium' }, artifactsKey: 'artifacts' })
  const market = createMarket({ products, categories: [{ id: 'currency' }], repository, rewardHandlers: createGameRewardHandlers(artifacts) })
  return { storage, repository, market }
}

test('three currencies pay for multiple packs and exact reward amounts', async () => {
  for (const currency of ['cash', 'chronoshards', 'aetherium']) {
    const { market } = setup()
    await market.purchase('pack', { paymentId: currency, quantity: 3 })
    const state = market.getState()
    assert.equal(state.balances[currency], currency === 'chronoshards' ? 85 : 70)
    assert.equal(state.balances.chronoshards, currency === 'chronoshards' ? 85 : 115)
  }
})
test('invalid quantities, unknown payments and insufficient funds leave saves intact', async () => {
  const { market, storage } = setup()
  for (const quantity of [0, -1, 1.1, NaN, 11, Number.MAX_SAFE_INTEGER]) await assert.rejects(market.purchase('pack', { quantity }), { code: 'INVALID_QUANTITY' })
  await assert.rejects(market.purchase('pack', { paymentId: 'missing' }), { code: 'PAYMENT_UNAVAILABLE' })
  storage.setItem('cash', '0')
  await assert.rejects(market.purchase('pack'), { code: 'INSUFFICIENT_FUNDS' })
  assert.equal(market.getState().balances.chronoshards, 100)
  assert.deepEqual(market.getState().transactions, {})
})
test('concurrent purchases cannot overspend', async () => {
  const { market } = setup()
  const results = await Promise.allSettled([market.purchase('pack', { quantity: 8 }), market.purchase('pack', { quantity: 8 })])
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(market.getState().balances.cash, 20)
})
test('wallet retry remains idempotent even after a purchase limit is reached', async () => {
  const { market } = setup([{ ...pack, purchaseLimit: 1 }])
  const first = await market.purchase('pack', { requestId: 'same' })
  assert.deepEqual(await market.purchase('pack', { requestId: 'same' }), first)
  assert.equal(market.getState().balances.cash, 90)
  await assert.rejects(market.purchase('pack', { requestId: 'same', quantity: 2 }), { code: 'IDEMPOTENCY_CONFLICT' })
  await assert.rejects(market.purchase('pack'), { code: 'PURCHASE_LIMIT' })
})
test('partial storage write recovers payment, reward and ledger exactly once', async () => {
  const { market, storage } = setup()
  storage.failKey = 'chronoshards'
  await assert.rejects(market.purchase('pack', { requestId: 'recover' }), /Disk full/)
  assert.ok(storage.getItem(MARKET_JOURNAL_KEY))
  storage.failKey = null
  recoverMarketTransaction(storage)
  assert.equal(market.getState().balances.cash, 90)
  assert.equal(market.getState().balances.chronoshards, 105)
  await market.purchase('pack', { requestId: 'recover' })
  assert.equal(market.getState().balances.cash, 90)
  assert.equal(storage.getItem(MARKET_JOURNAL_KEY), null)
})
test('failure before journaling charges nothing', async () => {
  const { market, storage } = setup()
  storage.failKey = MARKET_JOURNAL_KEY
  await assert.rejects(market.purchase('pack'), /Disk full/)
  assert.equal(storage.getItem('cash'), '100')
})
test('artifact packs stack and permanent artifacts reject duplicate ownership', async () => {
  const { market } = setup([
    { ...pack, id: 'core', rewards: [{ type: 'artifact', artifactId: 'core', amount: 2 }] },
    { ...pack, id: 'map', rewards: [{ type: 'artifact', artifactId: 'map', amount: 1 }] },
  ])
  await market.purchase('core', { quantity: 3 })
  assert.equal(market.getState().artifacts.stackCounts.core, 6)
  await market.purchase('map')
  await assert.rejects(market.purchase('map'), { code: 'ALREADY_OWNED' })
})
test('permanent entitlement persists and stops subsequent purchases', async () => {
  const { market, storage } = setup([{ ...pack, rewards: [{ type: 'entitlement', entitlementId: 'remove-ads', amount: 1 }] }])
  await market.purchase('pack')
  assert.equal(hasMarketEntitlement('remove-ads', storage), true)
  await assert.rejects(market.purchase('pack'), { code: 'ALREADY_OWNED' })
})
test('paid checkout is unavailable without a provider and grants deduplicate', async () => {
  const paid = { ...pack, payments: [{ id: 'play', provider: 'google-play', productId: 'coins', consumable: true }] }
  const { market } = setup([paid])
  await assert.rejects(market.purchase('pack'), { code: 'PROVIDER_NOT_CONFIGURED' })
  const grant = { id: 'receipt', provider: 'google-play', productId: 'pack', storeProductId: 'coins', quantity: 2, rewards: paid.rewards }
  await market.fulfillVerifiedGrant(grant)
  await market.fulfillVerifiedGrant(grant)
  assert.equal(market.getState().balances.chronoshards, 110)
  await assert.rejects(market.fulfillVerifiedGrant({ ...grant, id: 'other', storeProductId: 'wrong' }), { code: 'PRODUCT_MISMATCH' })
})
test('future payment providers can start checkout and fulfill trusted external grants', async () => {
  const { market } = setup([{ ...pack, payments: [{ id: 'future', provider: 'voucher', productId: 'voucher-pack' }] }])
  market.registerPaymentProvider('voucher', { purchase: async (quote) => ({ status: 'processing', quantity: quote.quantity }) })
  assert.deepEqual(await market.purchase('pack', { quantity: 2 }), { status: 'processing', quantity: 2 })
  assert.equal(market.getState().balances.chronoshards, 100)
  await market.fulfillVerifiedGrant({ provider: 'voucher', id: 'verified-voucher', productId: 'pack', storeProductId: 'voucher-pack', quantity: 2, rewards: pack.rewards })
  assert.equal(market.getState().balances.chronoshards, 110)
})
test('disabled examples stay hidden and categories filter products', () => {
  const { market } = setup([pack, { ...pack, id: 'disabled', enabled: false }])
  assert.equal(market.listProducts().length, 1)
  assert.equal(market.listProducts({ includeDisabled: true }).length, 2)
  assert.equal(market.listProducts({ categoryId: 'absent' }).length, 0)
})
