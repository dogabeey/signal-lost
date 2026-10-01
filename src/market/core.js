export class MarketError extends Error {
  constructor(code, message = code) { super(message); this.name = 'MarketError'; this.code = code }
}
export function requireMarket(condition, code) { if (!condition) throw new MarketError(code) }
export function positiveInteger(value) { return Number.isSafeInteger(value) && value > 0 }

export function createMarket({ products, categories, repository, rewardHandlers, paymentProviders = {}, onCommit = () => {} }) {
  const catalog = structuredClone(products)
  const categoryList = structuredClone(categories)
  const uniqueIds = (items) => items.every((item) => typeof item.id === 'string' && item.id.length > 0) && new Set(items.map((item) => item.id)).size === items.length
  requireMarket(uniqueIds(categoryList) && uniqueIds(catalog), 'INVALID_CATALOG')
  for (const product of catalog) {
    requireMarket(categoryList.some((category) => category.id === product.categoryId), 'INVALID_CATEGORY')
    requireMarket(positiveInteger(product.maxQuantity) && (!product.purchaseLimit || positiveInteger(product.purchaseLimit)), 'INVALID_LIMIT')
    requireMarket(product.payments?.length && uniqueIds(product.payments) && product.rewards?.length, 'INVALID_PRODUCT')
    for (const reward of product.rewards) requireMarket(positiveInteger(reward.amount) && rewardHandlers[reward.type], 'INVALID_REWARD')
    for (const payment of product.payments) {
      requireMarket(typeof payment.provider === 'string', 'INVALID_PAYMENT')
      if (payment.provider === 'wallet') requireMarket(typeof payment.currency === 'string' && Number.isFinite(payment.amount) && payment.amount > 0, 'INVALID_PRICE')
    }
  }
  let tail = Promise.resolve()
  const listeners = new Set()
  const emit = (event) => { for (const listener of listeners) { try { listener(structuredClone(event)) } catch { /* Observers cannot break fulfillment. */ } } }
  // Serializes async providers as well as wallet transactions. Repository commits are synchronous.
  const exclusive = (work) => {
    const run = () => globalThis.window?.navigator?.locks
      ? navigator.locks.request(repository.lockName ?? 'asteroid-market', work) : work()
    const task = tail.then(run)
    tail = task.catch(() => {})
    return task
  }
  const findProduct = (id, allowDisabled = false) => {
    const product = catalog.find((item) => item.id === id)
    requireMarket(product && (allowDisabled || product.enabled === true), 'PRODUCT_UNAVAILABLE')
    return product
  }
  const check = (product, quantity, state) => {
    requireMarket(positiveInteger(quantity) && quantity <= product.maxQuantity, 'INVALID_QUANTITY')
    requireMarket(!product.purchaseLimit || (state.purchases[product.id] ?? 0) + quantity <= product.purchaseLimit, 'PURCHASE_LIMIT')
    const preview = structuredClone(state)
    for (const reward of product.rewards) {
      rewardHandlers[reward.type].validate?.(preview, reward, quantity)
      rewardHandlers[reward.type].apply(preview, reward, quantity)
    }
  }
  const apply = (state, product, quantity) => {
    for (const reward of product.rewards) rewardHandlers[reward.type].apply(state, reward, quantity)
    state.purchases[product.id] = (state.purchases[product.id] ?? 0) + quantity
  }
  const notify = (result) => { try { onCommit(repository.read()) } catch { emit({ type: 'refresh-failed' }) } emit({ type: 'fulfilled', ...result }) }
  return Object.freeze({
    listCategories: () => structuredClone(categoryList).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    listProducts: ({ categoryId, includeDisabled = false } = {}) => structuredClone(catalog.filter((p) => (includeDisabled || p.enabled === true) && (!categoryId || p.categoryId === categoryId))),
    getState: () => repository.read(),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    registerPaymentProvider(id, provider) { requireMarket(id !== 'wallet' && provider?.purchase, 'INVALID_PROVIDER'); paymentProviders[id] = provider },
    registerRewardHandler(type, handler) { requireMarket(handler?.apply, 'INVALID_HANDLER'); rewardHandlers[type] = handler },
    quote(productId, { paymentId, quantity = 1 } = {}) {
      const product = findProduct(productId)
      const payment = product.payments.find((p) => p.id === paymentId) ?? (!paymentId ? product.payments[0] : null)
      requireMarket(payment, 'PAYMENT_UNAVAILABLE')
      check(product, quantity, repository.read())
      return structuredClone({ productId, quantity, payment, total: payment.provider === 'wallet' ? Math.round(payment.amount * quantity * 100) / 100 : null, rewards: product.rewards.map((r) => ({ ...r, amount: r.amount * quantity })) })
    },
    purchase(productId, options = {}) {
      return exclusive(async () => {
        if (options.requestId && repository.read().transactions[`wallet:${options.requestId}`]) {
          const existing = repository.read().transactions[`wallet:${options.requestId}`]
          const product = findProduct(productId, true)
          const paymentId = options.paymentId ?? product.payments[0].id
          requireMarket(existing.fingerprint === JSON.stringify([productId, paymentId, options.quantity ?? 1]), 'IDEMPOTENCY_CONFLICT')
          return structuredClone(existing)
        }
        const quote = this.quote(productId, options)
        const product = findProduct(productId)
        if (quote.payment.provider !== 'wallet') {
          const provider = paymentProviders[quote.payment.provider]
          requireMarket(provider, 'PROVIDER_NOT_CONFIGURED')
          // A provider starts checkout only. Verified fulfillment is a separate operation.
          return provider.purchase(quote)
        }
        const state = repository.read()
        const requestId = options.requestId ?? globalThis.crypto.randomUUID()
        requireMarket(typeof requestId === 'string' && requestId.length > 0 && requestId.length <= 200, 'INVALID_REQUEST_ID')
        const key = `wallet:${requestId}`
        const fingerprint = JSON.stringify([productId, quote.payment.id, quote.quantity])
        if (state.transactions[key]) {
          requireMarket(state.transactions[key].fingerprint === fingerprint, 'IDEMPOTENCY_CONFLICT')
          return structuredClone(state.transactions[key])
        }
        check(product, quote.quantity, state)
        const balance = state.balances[quote.payment.currency]
        requireMarket(Number.isFinite(balance) && balance >= quote.total, 'INSUFFICIENT_FUNDS')
        state.balances[quote.payment.currency] = Math.round((balance - quote.total) * 100) / 100
        apply(state, product, quote.quantity)
        const result = { id: key, productId, quantity: quote.quantity, fingerprint, status: 'fulfilled' }
        state.transactions[key] = result
        repository.commit(state)
        notify(result)
        return structuredClone(result)
      })
    },
    // Only call this from an authenticated verification transport, never a native approval event.
    fulfillVerifiedGrant(grant) {
      return exclusive(() => {
        requireMarket(typeof grant?.provider === 'string' && grant.provider !== 'wallet' && typeof grant.id === 'string' && grant.id.length > 0, 'INVALID_GRANT')
        const state = repository.read()
        const key = `${grant.provider}:${grant.id}`
        if (state.transactions[key]) return structuredClone(state.transactions[key])
        // Disabled products can still fulfill an already-paid purchase.
        const product = findProduct(grant.productId, true)
        requireMarket(product.payments.some((p) => p.provider === grant.provider && p.productId === grant.storeProductId), 'PRODUCT_MISMATCH')
        requireMarket(positiveInteger(grant.quantity) && Array.isArray(grant.rewards), 'INVALID_GRANT')
        // Paid pack count comes from Google, not the requested UI quantity.
        const paidProduct = { ...product, maxQuantity: Number.MAX_SAFE_INTEGER, rewards: grant.rewards.filter((reward) => !(reward.type === 'entitlement' && state.entitlements[reward.entitlementId])) }
        for (const reward of grant.rewards) requireMarket(positiveInteger(reward.amount) && rewardHandlers[reward.type], 'INVALID_REWARD')
        // Restoring a permanent product already bought with currency needs no second reward.
        const owned = paidProduct.purchaseLimit && (state.purchases[product.id] ?? 0) >= paidProduct.purchaseLimit
        if (!owned) { check(paidProduct, grant.quantity, state); apply(state, paidProduct, grant.quantity) }
        const result = { id: key, productId: product.id, quantity: grant.quantity, status: 'fulfilled' }
        state.transactions[key] = result
        repository.commit(state)
        notify(result)
        return structuredClone(result)
      })
    },
  })
}
