import test from 'node:test'
import assert from 'node:assert/strict'
import { createGooglePlayVerifier, accountIdFor } from '../server/market/google_play_verifier.js'
import { createPurchaseStore } from '../server/market/sqlite_store.js'
import { createGooglePlayProvider } from '../src/market/google_play.js'

const products = [{ id: 'pack', enabled: true, maxQuantity: 1, rewards: [{ type: 'currency', currency: 'aetherium', amount: 100 }], payments: [{ provider: 'google-play', productId: 'coins', consumable: true }] }]
function setup(purchase = {}) {
  const store = createPurchaseStore(':memory:')
  const calls = []
  let failConsume = false
  const google = { getClient: async () => ({ request: async (request) => {
    calls.push(request)
    if (request.method === 'POST' && failConsume) throw new Error('offline')
    return { data: { purchaseState: 0, consumptionState: 0, acknowledgementState: 0, obfuscatedExternalAccountId: accountIdFor('user'), quantity: 3, ...purchase } }
  } }) }
  const verifier = createGooglePlayVerifier({ packageName: 'com.test', products, store, google })
  return { store, calls, verifier, setFail: (value) => { failConsume = value } }
}
const receipt = { userId: 'user', storeProductId: 'coins', purchaseToken: 'secret-token' }

test('server verifies account, derives quantity from Google and consumes after durable grant', async () => {
  const { store, calls, verifier } = setup()
  try {
    const grant = await verifier.verify({ ...receipt, quantity: 10000, rewards: [] })
    assert.equal(grant.quantity, 3)
    assert.equal(grant.rewards[0].amount, 100)
    assert.equal(store.get(grant.id).finalized, true)
    assert.ok(calls.some((call) => call.method === 'POST' && call.url.endsWith(':consume')))
    assert.deepEqual(await verifier.verify(receipt), grant)
    assert.equal(store.list('user').length, 1)
    await assert.rejects(verifier.verify({ ...receipt, userId: 'thief' }), { code: 'RECEIPT_ALREADY_CLAIMED' })
  } finally { store.close() }
})
test('pending, canceled, consumed and wrong-account receipts grant nothing', async () => {
  for (const invalid of [{ purchaseState: 1 }, { purchaseState: 2 }, { consumptionState: 1 }, { obfuscatedExternalAccountId: 'thief' }, { quantity: -1 }]) {
    const { store, verifier } = setup(invalid)
    try { await assert.rejects(verifier.verify(receipt)); assert.equal(store.list('user').length, 0) } finally { store.close() }
  }
})
test('failed finalization retains grant and retry safely completes', async () => {
  const { store, verifier, setFail } = setup()
  try {
    setFail(true)
    await assert.rejects(verifier.verify(receipt), /offline/)
    assert.equal(store.list('user').length, 1)
    assert.equal(store.list('user')[0].finalized, false)
    setFail(false)
    const grants = await verifier.grants('user')
    assert.equal(grants.length, 1)
    assert.equal(store.list('user')[0].finalized, true)
  } finally { store.close() }
})
test('nonconsumable purchases are acknowledged rather than consumed', async () => {
  const { store, calls } = setup()
  const google = { getClient: async () => ({ request: async (request) => { calls.push(request); return { data: { purchaseState: 0, quantity: 1, obfuscatedExternalAccountId: accountIdFor('user') } } } }) }
  const verifier = createGooglePlayVerifier({ packageName: 'com.test', products: [{ ...products[0], payments: [{ ...products[0].payments[0], consumable: false }] }], store, google })
  try { await verifier.verify(receipt); assert.ok(calls.some((call) => call.method === 'POST' && call.url.endsWith(':acknowledge'))); assert.ok(!calls.some((call) => call.url.endsWith(':consume'))) } finally { store.close() }
})
test('native approval never fulfills if authenticated verification fails', async () => {
  const listeners = {}
  const grants = []
  const events = []
  const native = {
    addListener: async (event, handler) => { listeners[event] = handler; return { remove: async () => {} } },
    init: async () => {}, getAvailableProducts: async () => ({ products: [] }),
  }
  const provider = createGooglePlayProvider({ products, market: { fulfillVerifiedGrant: async (grant) => grants.push(grant) }, native,
    isAndroid: () => true, backendUrl: 'https://market.example', getAuthToken: async () => 'identity', onEvent: (event) => events.push(event),
    fetchImpl: async (url) => url.endsWith('/session') ? { ok: true, json: async () => ({ accountId: 'a'.repeat(64) }) } : { ok: false },
  })
  await provider.initialize()
  listeners.purchasesUpdated({ purchases: [{ getPurchaseState: 1, productIds: ['coins'], purchaseToken: 'forged' }] })
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(grants.length, 0)
  assert.ok(events.some((event) => event.code === 'VERIFICATION_FAILED'))
  await provider.dispose()
})
test('unsupported platforms and insecure verification configuration fail closed', async () => {
  const make = (options) => createGooglePlayProvider({ market: {}, products, ...options })
  await assert.rejects(make({ isAndroid: () => false }).initialize(), { code: 'PLATFORM_UNSUPPORTED' })
  await assert.rejects(make({ isAndroid: () => true, backendUrl: 'http://example.com', getAuthToken: () => 'token' }).initialize(), { code: 'VERIFICATION_NOT_CONFIGURED' })
})

test('refunded previously recorded purchases are not restored', async () => {
  let canceled = false
  const store = createPurchaseStore(':memory:')
  const google = { getClient: async () => ({ request: async () => ({ data: { purchaseState: canceled ? 1 : 0, quantity: 1, obfuscatedExternalAccountId: accountIdFor('user') } }) }) }
  const verifier = createGooglePlayVerifier({ packageName: 'com.test', products, store, google })
  try {
    await verifier.verify(receipt)
    canceled = true
    await assert.rejects(verifier.verify(receipt), { code: 'PURCHASE_NOT_COMPLETED' })
    assert.deepEqual(await verifier.grants('user'), [])
  } finally { store.close() }
})
