const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function formatSectorNumber(value) {
  let remaining = Math.max(1, Math.floor(Number(value) || 1))
  let result = ''
  for (const [amount, symbol] of ROMAN_NUMERALS) {
    while (remaining >= amount) {
      result += symbol
      remaining -= amount
    }
  }
  return result
}
