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
        // 1. Fetch the live exchange rate from a free, open API
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        
        if (data && data.rates && data.rates.GBP) {
            const rate = data.rates.GBP;
            
            // 2. Save it to the phone so it works offline later
            localStorage.setItem('usd_gbp_rate', rate);
            
            // 3. Update the little tag on the UI to 4 DECIMAL PLACES
            const gbpToUsd = (1 / rate).toFixed(4);
            const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${gbpToUsd}`;
            
            // 4. If you already typed a number in, re-calculate it instantly
            if (window.convertCurrency) window.convertCurrency();
            if (window.calculateTip) window.calculateTip();
            
            console.log("Live currency updated:", rate);
        }
    } catch (e) {
        console.log("Offline mode: Using cached currency rate.");
        
        // If offline, just update the UI to show the last saved rate (also 4 decimals)
        const cachedRate = localStorage.getItem('usd_gbp_rate');
        if (cachedRate) {
            const gbpToUsd = (1 / parseFloat(cachedRate)).toFixed(4);
            const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${gbpToUsd} (Offline)`;
        }
    }
}

export async function syncToCloud(action, payload) {
    if (!navigator.onLine || !APPS_SCRIPT_URL) return;
    try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) }); } catch (e) {}
}

export async function saveQuoteToSheet(location, quote, author, silent = false) {
    if (!state.quotesData) state.quotesData = []; 
    state.quotesData.push([location, quote, author]); 
    await setVal('offlineQuotes', state.quotesData);
    
    if (!navigator.onLine || !APPS_SCRIPT_URL) { 
        if(!silent) alert("Offline: Saved locally only."); 
        return; 
    }
    try { 
        fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addQuote', payload: { location, quote, author } }) }); 
    } catch (e) {}
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
