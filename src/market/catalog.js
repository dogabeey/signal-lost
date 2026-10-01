// Wallet test bundles are live. Real-money and other examples remain disabled.
// Amounts are per pack; quantity buys multiple packs. Real-money prices come from Play.
export const MARKET_CATEGORIES = [
  { id: 'currency', name: 'Currency', order: 10 },
  { id: 'artifacts', name: 'Artifacts', order: 20 },
  { id: 'special', name: 'Special', order: 30 },
]

export const MARKET_PRODUCTS = [
  ...[
    { amount: 100, price: 100 },
    { amount: 250, price: 200 },
    { amount: 400, price: 300 },
  ].map(({ amount, price }) => ({
    id: `chronoshards-${amount}`, categoryId: 'currency', name: `${amount} Chronoshards`, enabled: true,
    maxQuantity: 100, referenceUnitPrice: 1,
    rewards: [{ type: 'currency', currency: 'chronoshards', amount }],
    payments: [{ id: 'aetherium', provider: 'wallet', currency: 'aetherium', amount: price }],
  })),
  {
    id: 'chronoshards-pack', categoryId: 'currency', name: 'Chronoshards pack', enabled: false,
    maxQuantity: 100, rewards: [{ type: 'currency', currency: 'chronoshards', amount: 10 }],
    payments: [
      { id: 'aetherium', provider: 'wallet', currency: 'aetherium', amount: 10 },
      { id: 'cash', provider: 'wallet', currency: 'cash', amount: 1000 },
    ],
  },
  {
    id: 'aetherium-pack', categoryId: 'currency', name: 'Aetherium pack', enabled: false,
    maxQuantity: 1, rewards: [{ type: 'currency', currency: 'aetherium', amount: 100 }],
    payments: [{ id: 'google-play', provider: 'google-play', productId: 'aetherium_100', consumable: true }],
  },
  {
    id: 'dark-core', categoryId: 'artifacts', name: 'Dark Core', enabled: false,
    maxQuantity: 10, rewards: [{ type: 'artifact', artifactId: 'dark-core', amount: 1 }],
    payments: [{ id: 'chronoshards', provider: 'wallet', currency: 'chronoshards', amount: 100 }],
  },
  {
    id: 'remove-ads', categoryId: 'special', name: 'Remove automatic ads', enabled: false,
    maxQuantity: 1, purchaseLimit: 1,
    rewards: [{ type: 'entitlement', entitlementId: 'remove-ads', amount: 1 }],
    payments: [
      { id: 'aetherium', provider: 'wallet', currency: 'aetherium', amount: 1000 },
      { id: 'google-play', provider: 'google-play', productId: 'remove_ads', consumable: false },
    ],
  },
]
