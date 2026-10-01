import { getUiIconAsset } from './asset_catalog.js'
import { formatCompactNumber } from './formatters.js'
import { t } from './localisation.js'
import { MISSION_LIMIT, WEEKLY_MISSION_TARGET } from './daily_missions.js'

export function getDailyMissionsMarkup() {
  return `<button class="daily-missions-button" id="open-daily-missions" type="button" aria-label="${t('missions.title')}"><img src="${getUiIconAsset('dailyMissions')}" alt=""><span class="missions-badge" id="missions-badge" hidden></span></button>
  <div class="daily-missions-overlay hidden" id="daily-missions-overlay" role="dialog" aria-modal="true" aria-labelledby="daily-missions-heading">
    <section class="daily-missions-panel">
      <header class="missions-header"><div class="missions-balances"><span><img src="${getUiIconAsset('aetherium')}" alt="Aetherium"><b id="missions-aetherium">0</b></span><span><img src="${getUiIconAsset('chronoshards')}" alt="Chronoshards"><b id="missions-chronoshards">0</b></span></div><button class="missions-close" id="close-daily-missions" type="button" aria-label="${t('menu.back')}">×</button><h2 id="daily-missions-heading">${t('missions.title')}</h2></header>
      <section class="missions-weekly" aria-labelledby="missions-weekly-title"><div class="missions-weekly-meta"><span id="missions-week-reset"></span><strong id="missions-week-count"></strong></div><h3 id="missions-weekly-title">${t('missions.weekly')}</h3><div class="missions-weekly-route"><div class="missions-weekly-track" role="progressbar" aria-valuemin="0" aria-valuemax="15" aria-label="${t('missions.weekly')}"><i id="missions-weekly-fill"></i></div><button class="missions-chest" id="claim-weekly-missions" type="button"><img src="${getUiIconAsset('missionChest')}" alt=""><span id="missions-chest-label"></span></button></div><div class="missions-chest-rewards"><span><img src="${getUiIconAsset('aetherium')}" alt="Aetherium">×100</span><span><img src="${getUiIconAsset('chronoshards')}" alt="Chronoshards">×100</span></div></section>
      <div class="missions-list-heading"><strong id="missions-active-count"></strong><span id="missions-next-reset"></span></div>
      <div class="missions-list" id="missions-list"></div>
      <p class="missions-status" id="missions-status" role="status"></p>
      <button class="missions-return" id="return-from-missions" type="button">${t('missions.return')}</button>
    </section>
  </div>`
}

function countdown(until) {
  const minutes = Math.max(0, Math.ceil((until - Date.now()) / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor(minutes % 1440 / 60)
  return [days ? t('missions.days', { amount: days }) : '', hours ? t('missions.hours', { amount: hours }) : '', t('missions.minutes', { amount: minutes % 60 })].filter(Boolean).join(' ')
}

export function createDailyMissionsUI({ service, overlay, button, getBalances, onOpen, onClose }) {
  const badge = document.querySelector('#missions-badge')
  const list = overlay.querySelector('#missions-list')
  const weeklyButton = overlay.querySelector('#claim-weekly-missions')
  const status = overlay.querySelector('#missions-status')
  const ready = (mission) => mission.progress >= mission.target
  let priorFocus
  const updateBadge = () => {
    const count = service.getNotificationCount()
    badge.hidden = count === 0
    badge.textContent = count
    button.setAttribute('aria-label', `${t('missions.title')}${count ? ` · ${t('missions.notifications', { count })}` : ''}`)
  }
  function render() {
    updateBadge()
    if (overlay.classList.contains('hidden')) return
    const { missions, weekly, calendar, reward } = service.getState()
    const balances = getBalances()
    overlay.querySelector('#missions-aetherium').textContent = formatCompactNumber(balances.aetherium)
    overlay.querySelector('#missions-chronoshards').textContent = formatCompactNumber(balances.chronoshards)
    overlay.querySelector('#missions-week-reset').textContent = t('missions.reset_in', { time: countdown(calendar.nextWeekAt) })
    overlay.querySelector('#missions-next-reset').textContent = t('missions.next_in', { time: countdown(calendar.nextDayAt) })
    overlay.querySelector('#missions-active-count').textContent = t('missions.active', { count: missions.length, max: MISSION_LIMIT })
    overlay.querySelector('#missions-week-count').textContent = `${weekly.completed}/${WEEKLY_MISSION_TARGET}`
    const progress = Math.min(weekly.completed / WEEKLY_MISSION_TARGET, 1) * 100
    overlay.querySelector('#missions-weekly-fill').style.width = `${progress}%`
    overlay.querySelector('.missions-weekly-track').setAttribute('aria-valuenow', Math.min(weekly.completed, WEEKLY_MISSION_TARGET))
    weeklyButton.disabled = weekly.claimed || weekly.completed < WEEKLY_MISSION_TARGET
    weeklyButton.classList.toggle('is-ready', !weekly.claimed && weekly.completed >= WEEKLY_MISSION_TARGET)
    weeklyButton.classList.toggle('is-claimed', weekly.claimed)
    overlay.querySelector('#missions-chest-label').textContent = weekly.claimed ? t('missions.claimed') : weekly.completed >= WEEKLY_MISSION_TARGET ? t('missions.open_chest') : `${WEEKLY_MISSION_TARGET}`
    const focusedId = document.activeElement?.dataset?.claimMission
    list.innerHTML = missions.map((mission) => {
      const description = t(`missions.metric.${mission.metric}`, { target: mission.metric === 'playSeconds' ? mission.target / 60 : mission.target })
      const percent = Math.min(100, mission.progress / mission.target * 100)
      const time = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
      const displayed = ['playSeconds', 'stationarySeconds', 'rangedSeconds'].includes(mission.metric) ? `${time(mission.progress)} / ${time(mission.target)}` : `${Math.floor(mission.progress)} / ${mission.target}`
      return `<article class="mission-node${ready(mission) ? ' is-complete' : ''}"><div class="mission-description"><img class="mission-type-icon" src="${getUiIconAsset({ cells: 'missionCell', chronoPickups: 'chronoshards', playSeconds: 'missionClock', stationarySeconds: 'missionClock', rangedSeconds: 'missionClock', buildingActions: 'buildingSystem', weaponCards: 'weaponry' }[mission.metric] ?? 'dailyMissions')}" alt=""><h4>${description}</h4></div><div class="mission-rewards"><span><img src="${getUiIconAsset('aetherium')}" alt="Aetherium">×${reward.aetherium}</span><span><img src="${getUiIconAsset('chronoshards')}" alt="Chronoshards">×${reward.chronoshards}</span></div>${ready(mission) ? `<button class="mission-claim" type="button" data-claim-mission="${mission.id}">${t('missions.claim')}</button>` : `<div class="mission-progress" role="progressbar" aria-label="${description}" aria-valuemin="0" aria-valuemax="${mission.target}" aria-valuenow="${Math.floor(mission.progress)}"><i style="width:${percent}%"></i><span>${displayed}</span></div>`}</article>`
    }).join('') || `<p class="missions-empty">${t('missions.empty')}</p>`
    if (focusedId) list.querySelector(`[data-claim-mission="${focusedId}"]`)?.focus({ preventScroll: true })
  }
  function close() {
    overlay.classList.add('hidden')
    onClose()
    priorFocus?.focus({ preventScroll: true })
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    priorFocus = document.activeElement
    onOpen()
    overlay.classList.remove('hidden')
    service.markSeen()
    status.textContent = ''
    render()
    overlay.querySelector('#close-daily-missions').focus()
  })
  button.addEventListener('pointerdown', (event) => event.stopPropagation())
  overlay.addEventListener('pointerdown', (event) => event.stopPropagation())
  overlay.querySelector('#close-daily-missions').addEventListener('click', close)
  overlay.querySelector('#return-from-missions').addEventListener('click', close)
  overlay.addEventListener('click', (event) => { event.stopPropagation(); if (event.target === overlay) close() })
  overlay.addEventListener('keydown', (event) => {
    if (event.key === '"') return // Let the game's debug hotkey open its console.
    event.stopPropagation()
    if (event.key === 'Escape') { event.preventDefault(); close() }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button:not(:disabled)')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  })
  list.addEventListener('click', (event) => {
    const claim = event.target.closest('[data-claim-mission]')
    if (!claim) return
    try { if (service.claimMission(claim.dataset.claimMission)) status.textContent = t('missions.reward_claimed') }
    catch { status.textContent = t('missions.failed') }
  })
  weeklyButton.addEventListener('click', () => {
    try { if (service.claimWeekly()) status.textContent = t('missions.chest_claimed') }
    catch { status.textContent = t('missions.failed') }
  })
  service.subscribe(render)
  updateBadge()
  return { render, close, isOpen: () => !overlay.classList.contains('hidden') }
}
