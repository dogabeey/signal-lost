const ONBOARDING_STORAGE_KEY = 'asteroid-belt-onboarding-progress'

// Add future tutorial steps here. Each step is persisted independently so a
// later step can be introduced without replaying completed onboarding.
export const ONBOARDING_STEPS = Object.freeze([
  {
    id: 'quick-start',
    trigger: 'launch',
    shouldRun: ({ isSteamBuild }) => !isSteamBuild,
    run: async ({ startTutorialRun }) => startTutorialRun(),
  },
  {
    id: 'first-loss-guidance',
    trigger: 'first-loss',
    shouldRun: ({ isSteamBuild }) => !isSteamBuild,
    run: async ({ startFirstLossGuidance }) => startFirstLossGuidance(),
  },
  {
    id: 'sector-2-guidance',
    trigger: 'sector-2-unlocked',
    shouldRun: ({ isSteamBuild }) => !isSteamBuild,
    run: async ({ startSecondSectorGuidance }) => startSecondSectorGuidance(),
  },
  {
    id: 'first-research-guidance',
    trigger: 'research-first-loss',
    shouldRun: ({ isSteamBuild }) => !isSteamBuild,
    run: async ({ startFirstResearchGuidance }) => startFirstResearchGuidance(),
  },
])

function readProgress(storage) {
  try {
    const saved = JSON.parse(storage.getItem(ONBOARDING_STORAGE_KEY) ?? 'null')
    return { completed: new Set(Array.isArray(saved?.completed) ? saved.completed.filter((id) => typeof id === 'string') : []) }
  } catch {
    return { completed: new Set() }
  }
}

function saveProgress(storage, progress) {
  try {
    storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ completed: [...progress.completed] }))
  } catch {}
}

export function clearOnboardingProgress(storage = window.localStorage) {
  try { storage.removeItem(ONBOARDING_STORAGE_KEY) } catch {}
}

export function createOnboarding({ isSteamBuild, startTutorialRun, startFirstLossGuidance, startSecondSectorGuidance, startFirstResearchGuidance, onStepStarted, onStepCompleted, storage = window.localStorage }) {
  const progress = readProgress(storage)
  let activeStep = null

  return {
    async start(trigger = 'launch') {
      if (activeStep) return false
      for (const step of ONBOARDING_STEPS) {
        if (step.trigger !== trigger || progress.completed.has(step.id) || !step.shouldRun({ isSteamBuild })) continue
        activeStep = step
        await step.run({ startTutorialRun, startFirstLossGuidance, startSecondSectorGuidance, startFirstResearchGuidance })
        onStepStarted?.(step)
        return true
      }
      return false
    },
    completeActiveStep() {
      if (!activeStep) return false
      const completedStep = activeStep
      activeStep = null
      progress.completed.add(completedStep.id)
      saveProgress(storage, progress)
      onStepCompleted?.(completedStep)
      return true
    },
    isActiveStep(stepId) {
      return activeStep?.id === stepId
    },
  }
}
