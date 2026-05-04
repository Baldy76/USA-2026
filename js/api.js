import { state, setVal, getVal } from './store.js';

// 🛡️ BULLETPROOF CSV PARSER (Perfectly handles line breaks and commas inside cells)
function parseCSV(str) {
    if (!str) return [];
    let arr = [];
    let quote = false;
    let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        if (cc === '"' && quote && nc === '"') {
            arr[row][col] += cc; ++c; continue;
        }
        if (cc === '"') {
            quote = !quote; continue;
        }
        if (cc === ',' && !quote) {
            ++col; continue;
        }
        if (cc === '\r' && nc === '\n' && !quote) {
            ++row; col = 0; ++c; continue;
        }
        if (cc === '\n' && !quote) {
            ++row; col = 0; continue;
        }
        if (cc === '\r' && !quote) {
            ++row; col = 0; continue;
        }
        arr[row][col] += cc;
    }
    return arr.map(r => r.map(c => c.trim()));
}

export async function loadAllData() {
    const urls = {
        itinerary: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=0&single=true&output=csv',
        vault: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1815147575&single=true&output=csv',
        quotes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1334002705&single=true&output=csv',
        checklist: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1780052747&single=true&output=csv',
        hints: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1546389508&single=true&output=csv',
        vegasFood: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=1639469919&single=true&output=csv'
    };

    try {
        const fetchCSVData = async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error("HTTP error");
            const text = await r.text();
            return parseCSV(text);
        };

        const [itin, vault, quotes, checklist, hints, vegasFood] = await Promise.all([
            fetchCSVData(urls.itinerary),
            fetchCSVData(urls.vault),
            fetchCSVData(urls.quotes),
            fetchCSVData(urls.checklist),
            fetchCSVData(urls.hints),
            fetchCSVData(urls.vegasFood)
        ]);

        state.itineraryData = itin.length > 1 ? itin.slice(1) : [];
        state.vaultAndStaysData = vault.length > 1 ? vault.slice(1) : [];
        state.quotesData = quotes.length > 1 ? quotes.slice(1) : [];
        state.checklistData = checklist.length > 1 ? checklist.slice(1) : [];
        state.hintsData = hints.length > 1 ? hints.slice(1) : [];
        state.vegasFoodData = vegasFood.length > 1 ? vegasFood.slice(1) : [];
        
        state.sheetFamilies = [...new Set(state.vaultAndStaysData.map(r => r[0]).filter(f => f && f.toLowerCase() !== 'everyone'))];

        await Promise.all([
            setVal('itin_cache', state.itineraryData),
            setVal('vault_cache', state.vaultAndStaysData),
            setVal('quotes_cache', state.quotesData),
            setVal('checklist_cache', state.checklistData),
            setVal('hints_cache', state.hintsData),
            setVal('vegasFood_cache', state.vegasFoodData)
        ]);
    } catch (e) {
        console.warn("Network error or fetch failed. Using offline cached data");
        state.itineraryData = await getVal('itin_cache') || [];
        state.vaultAndStaysData = await getVal('vault_cache') || [];
        state.quotesData = await getVal('quotes_cache') || [];
        state.checklistData = await getVal('checklist_cache') || [];
        state.hintsData = await getVal('hints_cache') || [];
        state.vegasFoodData = await getVal('vegasFood_cache') || [];
    }
}

export async function fetchWeather(lat, lon) {
    const API_KEY = '84f67c304d9e03d368e54737d2f4476a';
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        return await r.json();
    } catch(e) { 
        return null; 
    }
}

export async function saveQuoteToSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbxeK98Y_Iu7fG7S6V6X-E9_mG-x_tW1G8K_N0J3F_O1N7_T_U/exec?action=addQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

export async function deleteQuoteFromSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbxeK98Y_Iu7fG7S6V6X-E9_mG-x_tW1G8K_N0J3F_O1N7_T_U/exec?action=deleteQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

export function syncToCloud(type, data) {
    console.log("Cloud sync active for:", type);
}

export async function initLiveCurrency() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        
        if (data && data.rates && data.rates.GBP) {
            const rate = data.rates.GBP;
            localStorage.setItem('usd_gbp_rate', rate);
            const gbpToUsd = (1 / rate).toFixed(4);
            const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${gbpToUsd}`;
            if (window.convertCurrency) window.convertCurrency();
            if (window.calculateTip) window.calculateTip();
        }
    } catch (e) {
        console.log("Offline mode: Using cached currency rate.");
        const cachedRate = localStorage.getItem('usd_gbp_rate');
        if (cachedRate) {
            const gbpToUsd = (1 / parseFloat(cachedRate)).toFixed(4);
            const rateTag = document.getElementById('live-rate-tag');
            if (rateTag) rateTag.innerText = `£1 = $${gbpToUsd} (Offline)`;
        }
    }
}

export function preCacheImages() {
    const imgs = ['./img/la.jpg', './img/utah.jpg', './img/vegas.jpg', './img/flights.jpg'];
    imgs.forEach(src => { 
        const img = new Image(); 
        img.src = src; 
    });
}
