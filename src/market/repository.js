import { requireMarket } from './core.js'

export const MARKET_LEDGER_KEY = 'asteroid-belt-market-ledger-v1'
export const MARKET_JOURNAL_KEY = 'asteroid-belt-market-journal-v1'
export const MARKET_ENTITLEMENTS_KEY = 'asteroid-belt-market-entitlements-v1'

// Recover BEFORE loading game state. Absolute values make replay idempotent.
export function recoverMarketTransaction(storage = globalThis.localStorage) {
  const raw = storage.getItem(MARKET_JOURNAL_KEY)
  if (!raw) return
  const journal = JSON.parse(raw)
  requireMarket(journal.version === 1 && Array.isArray(journal.writes), 'INVALID_JOURNAL')
  for (const [key, value] of journal.writes) storage.setItem(key, value)
  storage.removeItem(MARKET_JOURNAL_KEY)
}

export function hasMarketEntitlement(id, storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(MARKET_ENTITLEMENTS_KEY) ?? '{}')[id] === true } catch { return false }
}

export function createLocalMarketRepository({ storage, currencyKeys, artifactsKey, scope = 'default' }) {
  const readJson = (key, fallback) => JSON.parse(storage.getItem(key) ?? JSON.stringify(fallback))
  return {
    lockName: 'asteroid-market',
    read() {
      recoverMarketTransaction(storage)
      const ledger = readJson(MARKET_LEDGER_KEY, { transactions: {}, scopes: {} })
      const balances = Object.fromEntries(Object.entries(currencyKeys).map(([currency, key]) => [currency, Number(storage.getItem(key) ?? 0)]))
      for (const value of Object.values(balances)) requireMarket(Number.isFinite(value) && value >= 0, 'INVALID_BALANCE')
      return {
        balances, artifacts: readJson(artifactsKey, { unlocked: [], stackCounts: {}, resetAtScores: {} }),
        entitlements: readJson(MARKET_ENTITLEMENTS_KEY, {}),
        transactions: ledger.transactions, purchases: ledger.scopes[scope] ?? {},
      }
    },
    commit(state) {
      const ledger = readJson(MARKET_LEDGER_KEY, { transactions: {}, scopes: {} })
      const writes = [
        ...Object.entries(currencyKeys).map(([currency, key]) => [key, String(state.balances[currency])]),
        [artifactsKey, JSON.stringify(state.artifacts)],
        [MARKET_ENTITLEMENTS_KEY, JSON.stringify(state.entitlements)],
        [MARKET_LEDGER_KEY, JSON.stringify({ transactions: state.transactions, scopes: { ...ledger.scopes, [scope]: state.purchases } })],
      ]
      // Do not use the game's best-effort writers: payment failures must be visible.
      storage.setItem(MARKET_JOURNAL_KEY, JSON.stringify({ version: 1, writes }))
      recoverMarketTransaction(storage)
    },
  }
}
