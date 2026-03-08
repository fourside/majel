/** WMO weather code → icon image path */
const wmoIconPaths = {
  0: "/images/weather/sunny.gif",
  1: "/images/weather/partly-cloudy.gif",
  2: "/images/weather/mostly-cloudy.gif",
  3: "/images/weather/cloudy.gif",
  45: "/images/weather/fog.gif",
  48: "/images/weather/fog.gif",
  51: "/images/weather/light-rain.gif",
  53: "/images/weather/light-rain.gif",
  55: "/images/weather/rain.gif",
  61: "/images/weather/rain.gif",
  63: "/images/weather/rain.gif",
  65: "/images/weather/rain.gif",
  71: "/images/weather/snow.gif",
  73: "/images/weather/snow.gif",
  75: "/images/weather/heavy-snow.gif",
  80: "/images/weather/light-rain.gif",
  81: "/images/weather/rain.gif",
  95: "/images/weather/thunder.gif",
  96: "/images/weather/thunder.gif",
  99: "/images/weather/thunder.gif",
};

/** @param {number} code */
export function wmoCodeToIcon(code) {
  return wmoIconPaths[code] ?? "/images/weather/cloudy.gif";
}

/** @param {number} temp */
export function formatTemperature(temp) {
  return Math.round(temp) + "°C";
}
