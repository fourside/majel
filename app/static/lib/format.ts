export function formatSensorValue(
  value: number | null | undefined,
  unit: string,
  decimals = 0,
): string {
  if (value === null || value === undefined) return "--" + unit;
  return value.toFixed(decimals) + unit;
}

export function formatSensorParts(
  value: number | null | undefined,
  unit: string,
  decimals = 0,
): { num: string; unit: string } {
  const num = value === null || value === undefined
    ? "--"
    : value.toFixed(decimals);
  return { num, unit };
}
