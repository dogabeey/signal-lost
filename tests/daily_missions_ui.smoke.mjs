import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const url = process.env.MARKET_TEST_URL ?? 'http://127.0.0.1:4174/'
const errors = []
const seed = () => {
  localStorage.setItem('asteroid-belt-settings', JSON.stringify({ language: 'en' }))
  localStorage.setItem('asteroid-belt-onboarding-progress', JSON.stringify({ completed: ['quick-start', 'first-loss-guidance', 'sector-2-guidance', 'first-research-guidance'] }))
}
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(seed)
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('#missions-badge').textContent(), '3')
  const debug = async (command) => {
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press('"')
    await page.locator('#cheat-input').fill(command)
    await page.locator('#cheat-input').press('Enter')
    await page.locator('#cheat-input').press('Escape')
  }
  await debug('trigger_misison')
  await debug('trigger_misison')
  await debug('trigger_misison')
  assert.equal(await page.locator('#missions-badge').textContent(), '9')
  await page.locator('#open-daily-missions').click()
  assert.equal(await page.locator('.mission-node').count(), 9)
  assert.equal(await page.locator('#missions-badge').isVisible(), false)
  await page.screenshot({ path: process.env.TEMP + '/daily-missions-desktop.png' })
  await debug('complete_random_mission')
  assert.equal(await page.locator('.mission-claim').count(), 1)
  assert.equal(await page.locator('#missions-badge').textContent(), '1')
  await page.locator('.mission-claim').click()
  assert.equal(await page.locator('.mission-node').count(), 8)
  const balances = () => page.evaluate(() => [localStorage.getItem('asteroid-belt-aetherium'), localStorage.getItem('asteroid-belt-chronoshards')])
  assert.deepEqual(await balances(), ['5', '5'])
  for (let index = 1; index < 15; index++) {
    if (!await page.locator('.mission-node').count()) await debug('trigger_misison')
    await debug('complete_random_mission')
    await page.locator('.mission-claim').first().click()
  }
  assert.equal(await page.locator('#missions-week-count').textContent(), '15/15')
  assert.equal(await page.locator('#claim-weekly-missions').isEnabled(), true)
  await page.locator('#claim-weekly-missions').click()
  assert.deepEqual(await balances(), ['175', '175'])
  assert.equal(await page.locator('#claim-weekly-missions').isEnabled(), false)
  await page.locator('#return-from-missions').click()
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('#open-daily-missions').click()
  assert.equal(await page.locator('#missions-week-count').textContent(), '15/15')
  assert.equal(await page.locator('#claim-weekly-missions').isEnabled(), false)
  await page.locator('#return-from-missions').click()

  // Actual gameplay events, excluding time spent in the mission screen.
  await page.locator('#start-button').click()
  await page.keyboard.press('w')
  await page.locator('#open-daily-missions').click()
  const elapsed = await page.locator('#score').textContent()
  await page.waitForTimeout(1200)
  assert.equal(await page.locator('#score').textContent(), elapsed)
  await page.locator('#return-from-missions').click()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await mobile.addInitScript(seed)
  const phone = await mobile.newPage()
  phone.on('pageerror', (error) => errors.push(error.message))
  await phone.goto(url, { waitUntil: 'networkidle' })
  await phone.locator('#open-daily-missions').click()
  assert.equal(await phone.locator('.mission-node').count(), 3)
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await phone.screenshot({ path: process.env.TEMP + '/daily-missions-mobile.png' })
  await phone.setViewportSize({ width: 844, height: 390 })
  assert.equal(await phone.locator('#return-from-missions').isVisible(), true)
  await phone.locator('#return-from-missions').click()
  assert.equal(await phone.locator('#daily-missions-overlay').isVisible(), false)
  assert.deepEqual(errors, [])
  console.log('Daily missions UI: notifications, debug commands, 9-task cap, claims, weekly chest, persistence, pause and mobile layout passed.')
} finally { await browser.close() }
