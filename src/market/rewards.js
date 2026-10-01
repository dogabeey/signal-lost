import { requireMarket, positiveInteger } from './core.js'

export function createGameRewardHandlers(artifacts) {
  const artifactById = new Map(artifacts.map((artifact) => [artifact.id, artifact]))
  return {
    currency: {
      validate(state, reward, quantity) {
        requireMarket(Object.hasOwn(state.balances, reward.currency), 'UNKNOWN_CURRENCY')
        requireMarket(positiveInteger(reward.amount * quantity) && Number.isFinite(state.balances[reward.currency] + reward.amount * quantity) && state.balances[reward.currency] + reward.amount * quantity <= Number.MAX_SAFE_INTEGER, 'AMOUNT_OVERFLOW')
      },
      apply(state, reward, quantity) { state.balances[reward.currency] += reward.amount * quantity },
    },
    artifact: {
      validate(state, reward, quantity) {
        const artifact = artifactById.get(reward.artifactId)
        requireMarket(artifact, 'UNKNOWN_ARTIFACT')
        requireMarket(positiveInteger(reward.amount * quantity), 'AMOUNT_OVERFLOW')
        if (artifact.repeatable) requireMarket(Number.isSafeInteger((state.artifacts.stackCounts?.[artifact.id] ?? 0) + reward.amount * quantity), 'AMOUNT_OVERFLOW')
        if (!artifact.repeatable) requireMarket(reward.amount * quantity === 1 && !state.artifacts.unlocked.includes(artifact.id), 'ALREADY_OWNED')
      },
      apply(state, reward, quantity) {
        const artifact = artifactById.get(reward.artifactId)
        state.artifacts.stackCounts ??= {}
        if (artifact.repeatable) state.artifacts.stackCounts[artifact.id] = (state.artifacts.stackCounts[artifact.id] ?? 0) + reward.amount * quantity
        if (!state.artifacts.unlocked.includes(artifact.id)) state.artifacts.unlocked.push(artifact.id)
      },
    },
    entitlement: {
      validate(state, reward, quantity) { requireMarket(typeof reward.entitlementId === 'string' && reward.entitlementId.length > 0 && reward.amount * quantity === 1 && !state.entitlements[reward.entitlementId], 'ALREADY_OWNED') },
      apply(state, reward) { state.entitlements[reward.entitlementId] = true },
    },
  }
}
