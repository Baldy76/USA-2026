import { fetchWeather } from '../api.js?v=7.0.0';
import { escapeHTML } from '../store.js?v=7.0.0';

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨' }; return m[c] || '🌤️'; };

export async function initWeatherPill() {
    const loadSummary = async (lat, lon, id) => {
        try {
            const data = await fetchWeather(lat, lon);
            const el = document.getElementById(id);
            if(el) el.innerHTML = `${getWeatherIcon(data.current.weather[0].icon)} ${Math.round(data.current.main.temp)}°`;
        } catch(e) { 
            const el = document.getElementById(id);
            if(el) el.innerHTML = '🚫'; 
        }
    };
    loadSummary(34.0522, -118.2437, 'wp-la'); loadSummary(37.0965, -113.5684, 'wp-utah'); loadSummary(36.1699, -115.1398, 'wp-vegas');
    
    const locEl = document.getElementById('wp-local');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => loadSummary(pos.coords.latitude, pos.coords.longitude, 'wp-local'),
            err => { if(locEl) locEl.innerHTML = '🚫'; },
            { timeout: 5000, maximumAge: 60000 }
        );
    } else {
        if(locEl) locEl.innerHTML = '🚫';
    }
}

export async function setWeatherCity(target) {
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-w-${target}`); if (activeBtn) activeBtn.classList.add('active');
    
    const wDash = document.getElementById('WTH-dashboard');
    if(wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><div class="empty-text">Syncing Radar...</div></div>`;
    
    try {
        let lat = 34.0522, lon = -118.2437, locName = "Los Angeles", tz = 'America/Los_Angeles';
        if (target === 'utah') { lat = 37.0965; lon = -113.5684; locName = "Utah"; tz = 'America/Denver'; }
        else if (target === 'vegas') { lat = 36.1699; lon = -115.1398; locName = "Las Vegas"; tz = 'America/Los_Angeles'; }
        else if (target === 'local') {
            tz = undefined;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => { 
                        try {
                            const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
                            renderWeatherDOM(data, "Local GPS", tz); 
                        } catch(e) {
                            const fallbackData = await fetchWeather(lat, lon);
                            renderWeatherDOM(fallbackData, "Los Angeles", 'America/Los_Angeles');
                        }
                    }, 
                    async () => { 
                        const fallbackData = await fetchWeather(lat, lon);
                        renderWeatherDOM(fallbackData, "Los Angeles", 'America/Los_Angeles'); 
                    }, 
                    { timeout: 5000 }
                ); 
                return;
            }
            locName = "Local (Default LA)";
            tz = 'America/Los_Angeles';
        }
        const data = await fetchWeather(lat, lon);
        renderWeatherDOM(data, locName, tz);
    } catch(e) {
        if(wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">🚫</span><div class="empty-text">Weather Offline</div></div>`;
    }
}

export function openWeatherModal() {
    document.body.classList.add('no-scroll');
    document.getElementById('weather-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('weather-modal').classList.add('active'), 10);
    setWeatherCity('la');
}

export function closeWeatherModal() { 
    document.getElementById('weather-modal').classList.remove('active'); 
    setTimeout(() => { document.getElementById('weather-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

function renderWeatherDOM(data, fallbackName, tz) {
    const d = data.current; const locName = fallbackName || d.name;
    let forecastHtml = data.forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
        const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
        return `<div class="WTH-card" style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid var(--ios-grey); align-items: center;"><span style="font-weight: 800; opacity: 0.7;">${dayName}</span><span style="font-size: 24px;">${getWeatherIcon(day.weather[0].icon)}</span><span style="font-weight: 900; font-size: 16px;">${Math.round(day.main.temp)}°C</span></div>`; 
    }).join('');

    const timeOpts = tz ? {hour: '2-digit', minute:'2-digit', timeZone: tz} : {hour: '2-digit', minute:'2-digit'};
    const sunriseStr = new Date(d.sys.sunrise * 1000).toLocaleTimeString([], timeOpts);
    const sunsetStr = new Date(d.sys.sunset * 1000).toLocaleTimeString([], timeOpts);
    
    const nowMs = Date.now();
    let daylightText = "";
    if (nowMs < d.sys.sunrise * 1000) daylightText = "Waiting for Sunrise 🌅";
    else if (nowMs > d.sys.sunset * 1000) daylightText = "Sun has set 🌙";
    else {
        const diffMs = (d.sys.sunset * 1000) - nowMs;
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        daylightText = `☀️ ${hrs}h ${mins}m of daylight left`;
    }

    const daylightHtml = `
        <div style="background: var(--bg); border-radius: 16px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-around; text-align: center; border: 1px solid var(--ios-grey);">
            <div>
                <div style="font-size: 24px; margin-bottom: 5px;">🌅</div>
                <div style="font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">Sunrise</div>
                <div style="font-size: 15px; font-weight: 900;">${sunriseStr}</div>
            </div>
            <div style="width: 1px; background: var(--ios-grey);"></div>
            <div>
                <div style="font-size: 24px; margin-bottom: 5px;">🌇</div>
                <div style="font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">Sunset</div>
                <div style="font-size: 15px; font-weight: 900;">${sunsetStr}</div>
            </div>
        </div>
        <div style="text-align: center; font-size: 14px; font-weight: 900; color: var(--accent); margin-top: -10px; margin-bottom: 20px; background: var(--card); padding: 10px; border-radius: 12px; border: 1px solid var(--ios-grey);">
            ${daylightText}
        </div>
    `;

    const wDash = document.getElementById('WTH-dashboard');
    if (wDash) wDash.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,122,255,0.05)); border-radius: 20px; padding: 30px 20px; text-align: center; margin-bottom: 20px; border: 2px solid var(--accent);">
            <div style="font-size: 70px; line-height: 1;">${getWeatherIcon(d.weather[0].icon)}</div>
            <div style="font-size: 48px; font-weight: 900; color: var(--accent); margin: 10px 0;">${Math.round(d.main.temp)}°C</div>
            <div style="text-transform: capitalize; font-weight: 700;">${d.weather[0].description}</div>
            <div style="opacity: 0.5; margin-top: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(locName)}</div>
        </div>
        ${daylightHtml}
        <h3 style="margin: 0 0 10px; font-size: 18px; opacity: 0.8;">5-Day Forecast</h3>
        <div style="background: var(--bg); border-radius: 16px; padding: 10px;">${forecastHtml}</div>`; 
}
