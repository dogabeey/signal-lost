import { createMarket } from './core.js'
import { MARKET_CATEGORIES, MARKET_PRODUCTS } from './catalog.js'
import { createLocalMarketRepository } from './repository.js'
import { createGameRewardHandlers } from './rewards.js'
import { createGooglePlayProvider } from './google_play.js'

let market
let googlePlay

export function initializeGameMarket({ storage, currencyKeys, artifactsKey, artifacts, scope, onCommit }) {
  market = createMarket({
    products: MARKET_PRODUCTS, categories: MARKET_CATEGORIES,
    repository: createLocalMarketRepository({ storage, currencyKeys, artifactsKey, scope }),
    rewardHandlers: createGameRewardHandlers(artifacts), onCommit,
  })
  return market
}

export function getGameMarket() {
  if (!market) throw new Error('Game market is not initialized')
  return market
}

// A future account/sign-in module supplies short-lived Google ID tokens.
// No credentials or bearer tokens are persisted in game saves.
export async function configureGooglePlayPurchases({ backendUrl, getAuthToken, onEvent }) {
  const service = getGameMarket()
  if (googlePlay) await googlePlay.dispose()
  googlePlay = createGooglePlayProvider({ market: service, products: MARKET_PRODUCTS, backendUrl, getAuthToken, onEvent })
  service.registerPaymentProvider('google-play', googlePlay)
  await googlePlay.initialize()
  await googlePlay.restorePurchases()
  return googlePlay
}
