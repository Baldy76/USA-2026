import { state, setVal, getVal } from './store.js';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjyYf54mXK9y6RfeTn7gimNIwN5X0kBA4TqeymYc3WKhtOpprcpJ4xb51bbJQZ7wWh/exec"; 
const WEATHER_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 

// 🛡️ BULLETPROOF CSV PARSER
function parseCSV(str) {
    if (!str) return [];
    let arr = []; let quote = false; let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || '';
        if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { ++col; continue; }
        if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc === '\n' && !quote) { ++row; col = 0; continue; }
        if (cc === '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr.map(r => r.map(c => c.trim()));
}

export async function loadAllData() {
    const urls = {
        itinerary: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv',
        vault: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=96079970&single=true&output=csv',
        quotes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1357435334&single=true&output=csv',
        checklist: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1780052747&single=true&output=csv',
        hints: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1546389508&single=true&output=csv',
        vegasFood: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1639469919&single=true&output=csv',
        roadtrip: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=272130134&single=true&output=csv' // NEW
    };

    const stamp = '&t=' + Date.now();

    try {
        const fetchCSVData = async (url) => {
            const r = await fetch(url + stamp);
            if (!r.ok) throw new Error("HTTP error");
            const text = await r.text();
            return parseCSV(text);
        };

        const [itin, vault, quotes, checklist, hints, vegasFood, roadtrip] = await Promise.all([
            fetchCSVData(urls.itinerary), fetchCSVData(urls.vault), fetchCSVData(urls.quotes),
            fetchCSVData(urls.checklist), fetchCSVData(urls.hints), fetchCSVData(urls.vegasFood),
            fetchCSVData(urls.roadtrip) // NEW
        ]);

        state.itineraryData = itin.length > 1 ? itin.slice(1) : [];
        state.vaultAndStaysData = vault.length > 1 ? vault.slice(1) : [];
        state.quotesData = quotes.length > 1 ? quotes.slice(1) : [];
        state.checklistData = checklist.length > 1 ? checklist.slice(1) : [];
        state.hintsData = hints.length > 1 ? hints.slice(1) : [];
        state.vegasFoodData = vegasFood.length > 1 ? vegasFood.slice(1) : [];
        state.roadtripData = roadtrip.length > 1 ? roadtrip.slice(1) : []; // NEW
        
        state.sheetFamilies = [...new Set(state.vaultAndStaysData.map(r => r[0]).filter(f => f && f.toLowerCase() !== 'everyone'))];

        await Promise.all([
            setVal('itin_cache', state.itineraryData), setVal('vault_cache', state.vaultAndStaysData),
            setVal('quotes_cache', state.quotesData), setVal('checklist_cache', state.checklistData),
            setVal('hints_cache', state.hintsData), setVal('vegasFood_cache', state.vegasFoodData),
            setVal('roadtrip_cache', state.roadtripData) // NEW
        ]);
    } catch (e) {
        console.warn("Using offline cached data");
        state.itineraryData = await getVal('itin_cache') || []; state.vaultAndStaysData = await getVal('vault_cache') || [];
        state.quotesData = await getVal('quotes_cache') || []; state.checklistData = await getVal('checklist_cache') || [];
        state.hintsData = await getVal('hints_cache') || []; state.vegasFoodData = await getVal('vegasFood_cache') || [];
        state.roadtripData = await getVal('roadtrip_cache') || []; // NEW
    }
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
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates && data.rates.GBP) {
            const rate = data.rates.GBP; localStorage.setItem('usd_gbp_rate', rate);
            const gbpToUsd = (1 / rate).toFixed(4); const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${gbpToUsd}`;
            if (window.convertCurrency) window.convertCurrency(); if (window.calculateTip) window.calculateTip();
        }
    } catch (e) {
        const cachedRate = localStorage.getItem('usd_gbp_rate');
        if (cachedRate) {
            const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${(1 / parseFloat(cachedRate)).toFixed(4)} (Offline)`;
        }
    }
}

export async function syncToCloud(action, payload) {
    if (!navigator.onLine || !APPS_SCRIPT_URL) return;
    try { fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) }); } catch (e) {}
}

export async function saveQuoteToSheet(location, quote, author, silent = false) {
    if (!state.quotesData) state.quotesData = []; 
    state.quotesData.push([location, quote, author]); await setVal('offlineQuotes', state.quotesData);
    if (!navigator.onLine || !APPS_SCRIPT_URL) { if(!silent) alert("Offline: Saved locally only."); return; }
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
