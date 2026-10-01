import { getUiIconAsset, getArtifactAsset } from '../asset_catalog.js'
import { formatCompactNumber } from '../formatters.js'
import { t } from '../localisation.js'

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const categoryIcons = { currency: 'chronoshards', artifacts: 'artifacts', special: 'marketSpecial' }

export function getMarketPanelMarkup() {
  return `<section class="market-panel hidden" id="market-panel" aria-labelledby="market-heading">
    <div class="lab-header market-header"><div><p class="eyebrow">${t('market.eyebrow')}</p><h2 id="market-heading">${t('menu.market')}</h2></div><button class="secondary-button" id="close-market-button" type="button">${t('menu.back')}</button></div>
    <div class="market-topline"><p>${t('market.intro')}</p><div class="market-wallet" aria-label="Aetherium"><img src="${getUiIconAsset('aetherium')}" alt=""><span id="market-aetherium">0</span><small>AETHERIUM</small></div></div>
    <div class="market-tabs" id="market-tabs" role="tablist" aria-label="${t('market.categories')}"></div>
    <div id="market-bundles" class="market-grid" role="tabpanel" tabindex="0"></div>
    <p class="market-status" id="market-status" role="status" aria-live="polite"></p>
  </section>`
}

export function createMarketUI({ panel, getMarket, artifacts }) {
  const tabs = panel.querySelector('#market-tabs')
  const grid = panel.querySelector('#market-bundles')
  const status = panel.querySelector('#market-status')
  let categoryId = 'currency'
  let purchasing = false
  const rewardIcon = (reward) => reward.type === 'artifact'
    ? getArtifactAsset(artifacts.find((artifact) => artifact.id === reward.artifactId)?.icon ?? '')
    : getUiIconAsset(reward.type === 'currency' ? reward.currency : 'marketSpecial')
  const setStatus = (message, isError = false) => {
    status.textContent = message
    status.classList.toggle('is-error', isError)
  }
  function render() {
    const market = getMarket()
    const state = market.getState()
    const categories = market.listCategories()
    tabs.innerHTML = categories.map((category) => `<button type="button" role="tab" id="market-tab-${escapeHtml(category.id)}" aria-controls="market-bundles" aria-selected="${category.id === categoryId}" tabindex="${category.id === categoryId ? 0 : -1}" data-market-category="${escapeHtml(category.id)}"><img src="${getUiIconAsset(categoryIcons[category.id])}" alt=""><span>${escapeHtml(category.name)}</span></button>`).join('')
    grid.setAttribute('aria-labelledby', `market-tab-${categoryId}`)
    panel.querySelector('#market-aetherium').textContent = formatCompactNumber(state.balances.aetherium)
    const products = market.listProducts({ categoryId }).filter((product) => product.payments.some((payment) => payment.provider === 'wallet' && payment.currency === 'aetherium'))
    grid.classList.toggle('is-empty', products.length === 0)
    grid.innerHTML = products.length ? products.map((product) => {
      const payment = product.payments.find((option) => option.provider === 'wallet' && option.currency === 'aetherium')
      const currencyReward = product.rewards.find((reward) => reward.type === 'currency')
      const referencePrice = product.referenceUnitPrice * (currencyReward?.amount ?? 0)
      const discount = referencePrice > payment.amount ? Math.round((1 - payment.amount / referencePrice) * 100) : 0
      const canAfford = state.balances.aetherium >= payment.amount
      return `<article class="market-bundle${discount ? ' has-discount' : ''}">
        ${discount ? `<div class="market-discount" aria-label="${t('market.discount', { percent: discount })}"><span>✦</span> ${discount}% OFF</div>` : ''}
        <div class="market-bundle-rewards">${product.rewards.map((reward) => `<div class="market-reward"><img src="${rewardIcon(reward)}" alt="${escapeHtml(reward.currency ?? reward.artifactId ?? reward.entitlementId)}"><strong><span class="market-times">×</span>${formatCompactNumber(reward.amount)}</strong></div>`).join('')}</div>
        <p class="market-bundle-name">${escapeHtml(currencyReward?.currency === 'chronoshards' ? 'CHRONOSHARDS' : product.name)}</p>
        <button class="market-buy" type="button" data-market-buy="${escapeHtml(product.id)}" data-market-payment="${escapeHtml(payment.id)}" ${purchasing || !canAfford ? 'disabled' : ''} aria-label="${escapeHtml(t('market.buy_for', { product: product.name, price: payment.amount }))}" title="${escapeHtml(!canAfford ? t('market.insufficient') : t('market.buy_for', { product: product.name, price: payment.amount }))}"><img src="${getUiIconAsset('aetherium')}" alt="Aetherium"><span>×${formatCompactNumber(payment.amount)}</span></button>
      </article>`
    }).join('') : `<div class="market-empty"><img src="${getUiIconAsset(categoryIcons[categoryId])}" alt=""><p>${t('market.empty')}</p></div>`
  }
  function selectCategory(id) {
    categoryId = id
    setStatus('')
    render()
    tabs.querySelector('[aria-selected="true"]').focus()
  }
  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-market-category]')
    if (button) selectCategory(button.dataset.marketCategory)
  })
  tabs.addEventListener('keydown', (event) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')]
    let index = buttons.findIndex((button) => button.dataset.marketCategory === categoryId)
    if (event.key === 'ArrowRight') index = (index + 1) % buttons.length
    else if (event.key === 'ArrowLeft') index = (index + buttons.length - 1) % buttons.length
    else if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = buttons.length - 1
    else return
    event.preventDefault()
    selectCategory(buttons[index].dataset.marketCategory)
  })
  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-market-buy]')
    if (!button || button.disabled || purchasing) return
    purchasing = true
    const productId = button.dataset.marketBuy
    const paymentId = button.dataset.marketPayment
    setStatus(t('market.purchasing'))
    render()
    try {
      await getMarket().purchase(productId, { paymentId, requestId: crypto.randomUUID() })
      setStatus(t('market.purchased'))
    } catch (error) { setStatus(t(error.code === 'INSUFFICIENT_FUNDS' ? 'market.insufficient' : 'market.failed'), true) }
    finally {
      purchasing = false
      render()
      grid.querySelector(`[data-market-buy="${productId}"]:not(:disabled)`)?.focus()
    }
  })
  return { render, open() { setStatus(''); render() } }
}
