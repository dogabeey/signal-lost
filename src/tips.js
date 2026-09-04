import { t } from './localisation.js'

export const TIPS = Array.from({ length: 14 }, (_unused, index) => t(`tip.${index + 1}`))
