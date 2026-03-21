export function calculateBars(
  values: number[] | null,
  maxHeight = 32,
  minHeight = 8,
  emptyHeight = 6,
): { height: number; dim: boolean }[] {
  const hasData = values && values.length > 0;
  if (!hasData) {
    return Array.from({ length: 24 }, () => ({
      height: emptyHeight,
      dim: true,
    }));
  }
  const max = Math.max(...values, 1);
  return values.map((v) => ({
    height: (v / max) * maxHeight + minHeight,
    dim: false,
  }));
}
