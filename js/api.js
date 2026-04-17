import { state, setVal, getVal } from './store.js';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv";
const VAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=96079970&single=true&output=csv";
const QUOTES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1357435334&single=true&output=csv";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjyYf54mXK9y6RfeTn7gimNIwN5X0kBA4TqeymYc3WKhtOpprcpJ4xb51bbJQZ7wWh/exec"; 
const WEATHER_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 

export async function loadAllData() {
    try {
        const [itinRes, vaultRes, quotesRes] = await Promise.all([
            fetch(SHEET_CSV_URL + '&t=' + Date.now()), fetch(VAULT_CSV_URL + '&t=' + Date.now()), fetch(QUOTES_CSV_URL + '&t=' + Date.now())
        ]);
        if (!itinRes.ok || !vaultRes.ok || !quotesRes.ok) throw new Error("Network response was not ok");

        state.itineraryData = parseCSV(await itinRes.text()).slice(1);
        state.vaultAndStaysData = parseCSV(await vaultRes.text()).slice(1);
        state.quotesData = parseCSV(await quotesRes.text()).slice(1);
        state.sheetFamilies = [...new Set(state.itineraryData.map(row => (row[4] || '').trim()).filter(Boolean))];

        await setVal('offlineItin', state.itineraryData); await setVal('offlineVault', state.vaultAndStaysData);
        await setVal('offlineQuotes', state.quotesData); await setVal('offlineFamilies', state.sheetFamilies);
    } catch (error) {
        state.itineraryData = await getVal('offlineItin') || []; state.vaultAndStaysData = await getVal('offlineVault') || [];
        state.quotesData = await getVal('offlineQuotes') || []; state.sheetFamilies = await getVal('offlineFamilies') || [];
    }
}

function parseCSV(str) {
    const arr = []; let quote = false; let row = 0; let col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1]; arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    } return arr;
}

export async function fetchWeather(lat, lon) {
    try {
        const [current, forecast] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`).then(r => r.json())
        ]); return { current, forecast };
    } catch (e) { throw e; }
}

export async function initLiveCurrency() {
    try {
        const response = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=USD');
        if (!response.ok) throw new Error("Offline");
        const data = await response.json();
        state.liveExchangeRate = data.rates.USD; window.liveExchangeRate = data.rates.USD; 
        localStorage.setItem('offline_exchange_rate', state.liveExchangeRate);
        const tag = document.getElementById('live-rate-tag'); if(tag) tag.innerText = `£1 = $${state.liveExchangeRate.toFixed(2)}`;
        const usdInput = document.getElementById('usd-input'); if (usdInput && usdInput.value) usdInput.dispatchEvent(new Event('input'));
        const billInput = document.getElementById('bill-total'); if (billInput && billInput.value) billInput.dispatchEvent(new Event('input'));
    } catch (error) {
        state.liveExchangeRate = parseFloat(localStorage.getItem('offline_exchange_rate')) || 1.25; 
        window.liveExchangeRate = state.liveExchangeRate;
        const tag = document.getElementById('live-rate-tag'); if(tag) tag.innerText = `£1 = $${state.liveExchangeRate.toFixed(2)} (OFFLINE)`;
    }
}

export async function syncToCloud(action, payload) {
    if (!navigator.onLine || !APPS_SCRIPT_URL) return;
    try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) }); } catch (e) {}
}

export async function saveQuoteToSheet(location, quote, author) {
    if (!state.quotesData) state.quotesData = []; state.quotesData.push([location, quote, author]); await setVal('offlineQuotes', state.quotesData);
    if (!navigator.onLine || !APPS_SCRIPT_URL) { alert("Offline: Saved locally only."); return; }
    try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addQuote', payload: { location, quote, author } }) }); } catch (e) {}
}

export async function deleteQuoteFromSheet(location, quote, author) {
    if (state.quotesData) {
        const index = state.quotesData.findIndex(q => q[0] === location && q[1] === quote && q[2] === author);
        if (index > -1) state.quotesData.splice(index, 1); await setVal('offlineQuotes', state.quotesData);
    }
    if (!navigator.onLine || !APPS_SCRIPT_URL) return;
    try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteQuote', payload: { location, quote, author } }) }); } catch (e) {}
}

export function preCacheImages() {
    if (!state.vaultAndStaysData) return;
    state.vaultAndStaysData.forEach(row => {
        if (row.length > 7 && (row[1] || '').trim().toLowerCase() === 'stay' && row[7]) { const img = new Image(); img.src = row[7].trim(); }
    });
}
