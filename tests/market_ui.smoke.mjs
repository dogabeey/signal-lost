import { chromium } from 'playwright'
import assert from 'node:assert/strict'

// Fresh isolated browser context: this never reads or changes the player's saves.
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const seed = () => {
  localStorage.setItem('asteroid-belt-settings', JSON.stringify({ language: 'en' }))
  if (localStorage.getItem('asteroid-belt-aetherium') === null) localStorage.setItem('asteroid-belt-aetherium', '600')
  if (localStorage.getItem('asteroid-belt-chronoshards') === null) localStorage.setItem('asteroid-belt-chronoshards', '0')
  localStorage.setItem('asteroid-belt-onboarding-progress', JSON.stringify({ completed: ['quick-start', 'first-loss-guidance', 'sector-2-guidance', 'first-research-guidance'] }))
}
await context.addInitScript(seed)
const page = await context.newPage()
page.on('pageerror', (error) => errors.push(error.message))
const url = process.env.MARKET_TEST_URL ?? 'http://127.0.0.1:4174/'
try {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('#open-market-button').click()
  assert.equal(await page.locator('.market-bundle').count(), 3)
  assert.deepEqual(await page.locator('.market-discount').allTextContents().then((items) => items.map((item) => item.trim())), ['✦ 20% OFF', '✦ 25% OFF'])
  assert.deepEqual(await page.locator('.market-tabs [role="tab"] span').allTextContents(), ['Currency', 'Artifacts', 'Special'])
  await page.screenshot({ path: process.env.TEMP + '/market-desktop.png' })
  for (const amount of [100, 250, 400]) {
    await page.locator(`[data-market-buy="chronoshards-${amount}"]`).click()
    await page.locator('#market-status').filter({ hasText: 'Bundle purchased.' }).waitFor()
  }
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('asteroid-belt-aetherium'), localStorage.getItem('asteroid-belt-chronoshards')]), ['0', '750'])
  assert.equal(await page.locator('.market-buy:disabled').count(), 3)
  await page.locator('[data-market-category="artifacts"]').click()
  assert.equal(await page.locator('.market-empty').count(), 1)
  await page.locator('[data-market-category="special"]').click()
  assert.equal(await page.locator('.market-empty').count(), 1)
  await page.locator('[data-market-category="currency"]').click()
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('#open-market-button').click()
  assert.equal(await page.locator('#market-aetherium').textContent(), '0')
  await page.locator('#close-market-button').click()
  assert.equal(await page.locator('#market-panel').isVisible(), false)
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mobile.addInitScript(seed)
  const phone = await mobile.newPage()
  phone.on('pageerror', (error) => errors.push(error.message))
  await phone.goto(url, { waitUntil: 'networkidle' })
  await phone.locator('#open-market-button').click()
  const bounds = await phone.locator('.menu-system-button:not(.menu-utility-button)').evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect()
    return { id: button.id, x: rect.x, y: rect.y, width: rect.width, bottom: rect.bottom }
  }))
  assert.equal(bounds.length, 5)
  await phone.screenshot({ path: process.env.TEMP + '/market-mobile.png' })
  assert.ok(bounds.every((rect) => rect.width <= 79 && Math.abs(rect.bottom - 844) <= 1), JSON.stringify(bounds))
  assert.equal(await phone.locator('.market-bundle').count(), 3)
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await phone.screenshot({ path: process.env.TEMP + '/market-mobile.png' })
  await phone.locator('#home-button').click()
  assert.equal(await phone.locator('#market-panel').isVisible(), false)
  await phone.locator('#open-market-button').click()
  await phone.locator('#open-artifacts-button').isVisible().then((visible) => assert.equal(visible, false))
  await phone.setViewportSize({ width: 844, height: 390 })
  assert.equal(await phone.locator('#open-market-button').isVisible(), true)
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await phone.locator('#home-button').click()
  assert.equal(await phone.locator('#market-panel').isVisible(), false)
  assert.deepEqual(errors, [])
  console.log('Market UI: desktop, mobile portrait/landscape, tabs, 3 purchases, insufficient balance, navigation and save persistence passed.')
  await mobile.close()
} finally { await browser.close() }
