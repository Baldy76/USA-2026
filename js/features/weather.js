import { fetchWeather } from '../api.js';

export async function initWeatherPill() {
    const locs = { la: [34.05, -118.24], utah: [37.29, -113.02], vegas: [36.17, -115.13] };
    for (const [id, coords] of Object.entries(locs)) {
        const data = await fetchWeather(coords[0], coords[1]);
        const el = document.getElementById(`wp-${id}`);
        if (data && el) el.innerText = `${Math.round(data.main.temp)}°C`;
    }
}
