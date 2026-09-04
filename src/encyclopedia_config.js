import { t } from './localisation.js'

const ENCYCLOPEDIA_ENTRIES_BASE = [
  { id: 'regular', category: 'Enemies', name: 'Regular', model: 'spiked-enemy', firstSector: 1, description: 'A stationary asteroid enemy. Keep clear of its body while collecting Cells.' },
  { id: 'chaser', category: 'Enemies', name: 'Chaser', model: 'spiked-enemy', firstSector: 2, description: 'Detects the ship within its range and pursues it.' },
  { id: 'creeper', category: 'Enemies', name: 'Creeper', model: 'spiked-enemy', firstSector: 1, description: 'Slowly closes in from any distance and becomes faster as it survives.' },
  { id: 'poisonCreeper', category: 'Enemies', name: 'Poison Creeper', model: 'spiked-enemy', firstSector: 9, description: 'A Creeper variant that shifts between purple and dark green while leaving poisonous trails behind.' },
  { id: 'banger', category: 'Enemies', name: 'Banger', model: 'spiked-enemy', firstSector: 3, description: 'Arms itself, pulses a warning, then detonates over a wide area.' },
  { id: 'shooter', category: 'Enemies', name: 'Shooter', model: 'spiked-enemy', firstSector: 3, description: 'Fires projectiles at the ship when it enters firing range.' },
  { id: 'porter', category: 'Enemies', name: 'Porter', model: 'spiked-enemy', firstSector: 5, description: 'Occasionally teleports itself to random locations.' },
  { id: 'magnet', category: 'Enemies', name: 'Magnet', model: 'spiked-enemy', firstSector: 6, description: 'Pulls the ship toward itself while it is within range.' },
  { id: 'spore', category: 'Enemies', name: 'Spore', model: 'spiked-enemy', firstSector: 7, description: 'Bursts into small pieces of itself, then burst into even smaller pieces again.' },
  { id: 'stoneRock', category: 'Meteors', name: 'Stone Rock', model: 'falling-rock', firstSector: 1, description: 'A standard falling meteor. Avoid its marked impact point.' },
  { id: 'fieryRock', category: 'Meteors', name: 'Fiery Rock', model: 'falling-rock', firstSector: 3, description: 'A burning meteor that leaves a damaging fire hazard after impact.' },
  { id: 'splinter', category: 'Meteors', name: 'Splinter', model: 'falling-rock', firstSector: 2, description: 'Shatters on impact and sends fragments outward.' },
]

export const ENCYCLOPEDIA_ENTRIES = ENCYCLOPEDIA_ENTRIES_BASE.map((entry) => ({
  ...entry,
  category: t(`encyclopedia.category.${entry.category.toLowerCase()}`, {}, entry.category),
  name: t(`enemy.${entry.id}.name`, {}, entry.name),
  description: t(`enemy.${entry.id}.description`, {}, entry.description),
}))
