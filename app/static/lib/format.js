/**
 * @param {number|null|undefined} value
 * @param {string} unit
 * @param {number} decimals
 */
export function formatSensorValue(value, unit, decimals = 0) {
  if (value === null || value === undefined) return "--" + unit;
  return value.toFixed(decimals) + unit;
}
