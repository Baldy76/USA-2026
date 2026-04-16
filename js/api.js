import { state, setVal, getVal } from './store.js';

const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; 

export async function loadAllData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getEverything`);
        const data = await response.json();
        state.itineraryData = data.itinerary;
        state.vaultAndStaysData = data.vault;
        state.sheetFamilies = data.families;
        state.quotesData = data.quotes || []; 
        state.liveExchangeRate = data.rate || 1.25;
        return data;
    } catch (e) {
        console.error("Fetch failed, loading offline backup", e);
        return null;
    }
}

export async function syncToCloud(type, payload) {
    if (!navigator.onLine) return;
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ type, payload, user: localStorage.getItem('appUser') })
        });
    } catch (e) { console.error("Cloud sync failed", e); }
}

export async function saveQuoteToSheet(location, quote, author) {
    if (!navigator.onLine) { alert("Offline: Quote saved locally only."); return; }
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                type: 'addQuote', 
                payload: { location, quote, author } 
            })
        });
        if (!state.quotesData) state.quotesData = [];
        state.quotesData.push([location, quote, author]);
    } catch (e) { console.error("Quote save failed", e); }
}

export async function fetchWeather(lat, lon) {
    const API_KEY = '5998a44415510660601956792372f69e';
    const currentReq = fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`).then(r => r.json());
    const forecastReq = fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`).then(r => r.json());
    const [current, forecast] = await Promise.all([currentReq, forecastReq]);
    return { current, forecast };
}

export function preCacheImages() {
    const imgs = ['./img/la.jpg', './img/utah.jpg', './img/vegas.jpg', './img/flights.jpg'];
    imgs.forEach(src => { const img = new Image(); img.src = src; });
}
