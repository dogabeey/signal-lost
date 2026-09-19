import { t } from './localisation.js'

export const TIPS = Array.from({ length: 16 }, (_unused, index) => t(`tip.${index + 1}`))
