import { state, setVal, getVal } from './store.js';

// ==========================================
// 🔗 LIVE GOOGLE SHEETS CONNECTIONS
// ==========================================
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv";
const VAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=96079970&single=true&output=csv";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjyYf54mXK9y6RfeTn7gimNIwN5X0kBA4TqeymYc3WKhtOpprcpJ4xb51bbJQZ7wWh/exec"; 

// Weather API Key (OpenWeatherMap)
const WEATHER_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 

export async function loadAllData() {
    try {
        const [itinRes, vaultRes] = await Promise.all([
            fetch(SHEET_CSV_URL),
            fetch(VAULT_CSV_URL)
        ]);

        if (!itinRes.ok || !vaultRes.ok) throw new Error("Network response was not ok");

        const itinText = await itinRes.text();
        const vaultText = await vaultRes.text();

        state.itineraryData = parseCSV(itinText).slice(1);
        state.vaultAndStaysData = parseCSV(vaultText).slice(1);

        state.sheetFamilies = [...new Set(state.itineraryData.map(row => row[4]?.trim()).filter(Boolean))];

        await setVal('offlineItin', state.itineraryData);
        await setVal('offlineVault', state.vaultAndStaysData);
        await setVal('offlineFamilies', state.sheetFamilies);

    } catch (error) {
        console.log("Offline mode: Loading from IndexedDB");
        state.itineraryData = await getVal('offlineItin') || [];
        state.vaultAndStaysData = await getVal('offlineVault') || [];
        state.sheetFamilies = await getVal('offlineFamilies') || [];
    }
}

function parseCSV(str) {
    const arr = []; let quote = false; let row = 0; let col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr;
}

export async function fetchWeather(lat, lon) {
    try {
        const [current, forecast] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`).then(r => r.json())
        ]);
        return { current, forecast };
    } catch (e) {
        console.error("Weather fetch failed", e);
        throw e;
    }
}

// ---- SMART OFFLINE CURRENCY CACHING ----
export async function initLiveCurrency() {
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP');
        if (!response.ok) throw new Error("Offline");
        
        const data = await response.json();
        state.liveExchangeRate = data.rates.GBP;
        
        // SAVE IT FOR OFFLINE USE
        localStorage.setItem('offline_exchange_rate', state.liveExchangeRate);
        
        const tag = document.getElementById('live-rate-tag');
        if(tag) tag.innerText = `RATE: ${state.liveExchangeRate.toFixed(3)}`;
        
    } catch (error) {
        // WE ARE OFFLINE - GRAB THE SAVED RATE
        const savedRate = localStorage.getItem('offline_exchange_rate');
        
        // If we have a saved rate, use it. If not, use a hardcoded 0.78 fallback.
        state.liveExchangeRate = savedRate ? parseFloat(savedRate) : 0.78; 
        
        const tag = document.getElementById('live-rate-tag');
        if(tag) tag.innerText = `RATE: ${state.liveExchangeRate.toFixed(3)} (OFFLINE)`;
    }
}

export async function syncToCloud(action, payload) {
    if (!navigator.onLine || !APPS_SCRIPT_URL) return;
    try {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
    } catch (e) {
        console.error("Cloud sync failed", e);
    }
}

export function preCacheImages() {
    if (!state.vaultAndStaysData) return;
    state.vaultAndStaysData.forEach(row => {
        if (row.length > 7 && row[1]?.trim().toLowerCase() === 'stay' && row[7]) {
            const img = new Image();
            img.src = row[7].trim();
        }
    });
}
