/**
 * @param {number[]|null} values
 * @param {number} maxHeight
 * @param {number} minHeight
 * @param {number} emptyHeight
 * @returns {{ height: number, dim: boolean }[]}
 */
export function calculateBars(values, maxHeight = 32, minHeight = 8, emptyHeight = 6) {
  const hasData = values && values.length > 0;
  if (!hasData) {
    return Array.from({ length: 24 }, () => ({ height: emptyHeight, dim: true }));
  }
  const max = Math.max(...values, 1);
  return values.map((v) => ({
    height: (v / max) * maxHeight + minHeight,
    dim: false,
  }));
}
