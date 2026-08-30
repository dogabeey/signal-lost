export function createResearchRules({ config, milestones, getResearchState, getMilestoneState, getBankedCells }) {
  const getResearchById = (researchId) => config.researches.find((research) => research.id === researchId)
  const getResearchLevel = (researchId) => getResearchState().levels[researchId] ?? 0
  const getAscensionMilestone = (researchId) => milestones.find((milestone) => milestone.rewards.some((reward) => reward.type === 'research' && reward.researchIds.includes(researchId)))

  function isMilestoneUnlocked(researchId) {
    const state = getMilestoneState()
    return state.researchUnlocks.includes(researchId) || milestones.some((milestone) => state.claimed.includes(milestone.id)
      && milestone.rewards.some((reward) => reward.type === 'research' && reward.researchIds.includes(researchId)))
  }

  function getResearchStatBonus(stat) {
    return config.researches.filter((research) => research.effect?.stat === stat)
      .reduce((total, research) => total + getResearchLevel(research.id) * research.effect.perLevel, 0)
  }

  function getResearchCost(research, level) {
    const jerk = research.cost.jerk ?? 1
    const amount = research.cost.base * research.cost.multiplier ** level * jerk ** (level * (level - 1) / 2)
    return research.cost.currency === 'cash' ? Math.round(amount * 100) / 100 : Math.ceil(amount)
  }

  function getResearchLockReason(research) {
    const requirements = research.requirements ?? {}
    const ascensionMilestone = getAscensionMilestone(research.id)
    if (ascensionMilestone && !getMilestoneState().debugAscensionsGranted && !isMilestoneUnlocked(research.id)) return `Requires ${ascensionMilestone.cells} Cells in Tier ${ascensionMilestone.tier}`
    if (requirements.minBankedCells && getBankedCells() < requirements.minBankedCells) return `Requires ${requirements.minBankedCells} banked cells`
    if (requirements.researchId && getResearchLevel(requirements.researchId) < 1) return `Requires ${getResearchById(requirements.researchId).name}`
    for (const [researchId, level] of Object.entries(requirements.researchLevels ?? {})) {
      if (getResearchLevel(researchId) < level) return `Requires ${getResearchById(researchId).name} Lv. ${level}`
    }
    return ''
  }

  function getProgressionOrder(research, visited = new Set()) {
    const ascensionTier = getAscensionMilestone(research.id)?.tier ?? 0
    if (visited.has(research.id)) return { tier: ascensionTier, depth: 0 }
    const requirements = research.requirements ?? {}
    const prerequisiteIds = [...(requirements.researchId ? [requirements.researchId] : []), ...Object.keys(requirements.researchLevels ?? {})]
    const prerequisiteOrders = prerequisiteIds.map(getResearchById).filter(Boolean).map((entry) => getProgressionOrder(entry, new Set(visited).add(research.id)))
    return { tier: Math.max(ascensionTier, ...prerequisiteOrders.map((order) => order.tier)), depth: prerequisiteOrders.length ? Math.max(...prerequisiteOrders.map((order) => order.depth)) + 1 : 0 }
  }

  function compareResearchProgression(first, second) {
    const firstOrder = getProgressionOrder(first)
    const secondOrder = getProgressionOrder(second)
    return firstOrder.tier - secondOrder.tier || firstOrder.depth - secondOrder.depth || first.name.localeCompare(second.name)
  }

  return {
    getResearchById,
    getResearchLevel,
    getResearchStatBonus,
    getResearchCost,
    getResearchDuration: (research, level) => Math.round(research.duration.baseMs * research.duration.multiplier ** level),
    getResearchLockReason,
    isResearchVisible: (research) => !research.visibleWhen?.anyResearch || research.visibleWhen.anyResearch.some((researchId) => getResearchLevel(researchId) > 0),
    compareResearchProgression,
  }
}
