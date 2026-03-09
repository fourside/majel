/**
 * @param {number|null|undefined} value
 * @param {string} unit
 * @param {number} decimals
 */
export function formatSensorValue(value, unit, decimals = 0) {
  if (value === null || value === undefined) return "--" + unit;
  return value.toFixed(decimals) + unit;
}

/**
 * @param {number|null|undefined} value
 * @param {string} unit
 * @param {number} decimals
 * @returns {{ num: string, unit: string }}
 */
export function formatSensorParts(value, unit, decimals = 0) {
  const num = value === null || value === undefined ? "--" : value.toFixed(decimals);
  return { num, unit };
}
