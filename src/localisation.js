import englishSource from './localisation/en.yml?raw'

function parseYaml(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.match(/^([\w.-]+):\s*"(.*)"\s*$/)).filter(Boolean).map(([, key, value]) => [key, value.replaceAll('\\"', '"')]))
}

const catalogues = Object.freeze({ en: parseYaml(englishSource) })
let currentLanguage = 'en'

export function setLanguage(language) { currentLanguage = catalogues[language] ? language : 'en' }
export function getAvailableLanguages() { return Object.keys(catalogues) }
export function t(key, values = {}, fallback = key) {
  const text = catalogues[currentLanguage]?.[key] ?? catalogues.en[key] ?? fallback
  return text.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? `{${name}}`))
}
