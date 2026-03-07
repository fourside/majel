export const wmoIcons = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "❄️",
  80: "🌦", 81: "🌧",
  95: "⛈", 96: "⛈", 99: "⛈",
};

/** @param {number} code */
export function wmoCodeToIcon(code) {
  return wmoIcons[code] ?? "🌡";
}

/** @param {number} temp */
export function formatTemperature(temp) {
  return Math.round(temp) + "°C";
}
