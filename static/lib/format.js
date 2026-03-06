/** @param {number} h @param {number} m @param {number} s */
export function formatTime(h, m, s) {
  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0")
  );
}

/**
 * @param {number|null|undefined} value
 * @param {string} unit
 * @param {number} decimals
 */
export function formatSensorValue(value, unit, decimals = 0) {
  if (value === null || value === undefined) return "--" + unit;
  return value.toFixed(decimals) + unit;
}
