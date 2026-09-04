import englishSource from './localisation/en.yml?raw'
import turkishSource from './localisation/tr.yml?raw'

function parseYaml(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.match(/^([\w.-]+):\s*"(.*)"\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replaceAll('\\"', '"')]))
}

const catalogues = Object.freeze({ en: parseYaml(englishSource), tr: parseYaml(turkishSource) })
export function getPreferredLanguage() {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]
  return languages.map((language) => language?.split('-')[0].toLowerCase()).find((language) => catalogues[language]) ?? 'en'
}

function getSavedLanguage() {
  try {
    const slot = Math.max(1, Number.parseInt(localStorage.getItem('asteroid-belt-active-save-slot') ?? '1', 10) || 1)
    const settings = JSON.parse(localStorage.getItem(`asteroid-belt-slot-${slot}-settings`) ?? localStorage.getItem('asteroid-belt-settings') ?? 'null')
    return catalogues[settings?.language] ? settings.language : getPreferredLanguage()
  } catch { return getPreferredLanguage() }
}

let currentLanguage = getSavedLanguage()

export function setLanguage(language) { currentLanguage = catalogues[language] ? language : 'en' }
export function getAvailableLanguages() { return Object.keys(catalogues) }
export function t(key, values = {}, fallback = key) {
  const text = catalogues[currentLanguage]?.[key] ?? catalogues.en[key] ?? fallback
  return text.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? `{${name}}`))
}
