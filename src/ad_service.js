import { AdMob } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'

// Google's official Android/iOS interstitial test unit. Replace this with the
// production ad unit from AdMob before publishing the mobile build.
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712'
const REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'

let isNativeAdPlatform = false
let isInitialized = false
let isLoading = false
let isLoaded = false
let isShowing = false

async function prepareInterstitial() {
  if (!isNativeAdPlatform || !isInitialized || isLoading || isLoaded || isShowing) return false
  isLoading = true
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID })
    isLoaded = true
    return true
  } catch {
    // No-fill and offline states must never interrupt a completed run.
    return false
  } finally {
    isLoading = false
  }
}

export async function initializeInterstitialAds() {
  isNativeAdPlatform = Capacitor.isNativePlatform() && ['android', 'ios'].includes(Capacitor.getPlatform())
  if (!isNativeAdPlatform) return false

  try {
    await AdMob.initialize()
    let consent = await AdMob.requestConsentInfo()
    if (!consent.canRequestAds && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm()
    if (!consent.canRequestAds) return false
    isInitialized = true
    return prepareInterstitial()
  } catch {
    return false
  }
}

export async function showInterstitialAfterPlayerDeath() {
  if (!isNativeAdPlatform || !isInitialized || !isLoaded || isShowing) return false
  isShowing = true
  isLoaded = false
  try {
    await AdMob.showInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID })
    return true
  } catch {
    return false
  } finally {
    isShowing = false
    void prepareInterstitial()
  }
}

// The web debug path intentionally simulates a completed ad so the reward flow
// remains testable without exposing it in distribution browser builds.
export async function showRewardedAdForAetherium({ debug = false } = {}) {
  if (!isNativeAdPlatform) return debug
  if (!isInitialized || isShowing) return false
  isShowing = true
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID })
    const reward = await AdMob.showRewardVideoAd()
    return Boolean(reward)
  } catch {
    return false
  } finally {
    isShowing = false
  }
}
