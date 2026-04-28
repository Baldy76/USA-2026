import { state, setVal, getVal } from './store.js';

// --- DATA FETCHING ---
export async function loadAllData() {
    const urls = {
        itinerary: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=0&single=true&output=csv',
        vault: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1815147575&single=true&output=csv',
        quotes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1334002705&single=true&output=csv'
    };

    try {
        const fetchCSV = async (url) => {
            const r = await fetch(url);
            const text = await r.text();
            return text.split('\n').map(row => row.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        };

        const [itin, vault, quotes] = await Promise.all([
            fetchCSV(urls.itinerary),
            fetchCSV(urls.vault),
            fetchCSV(urls.quotes)
        ]);

        state.itineraryData = itin.slice(1);
        state.vaultAndStaysData = vault.slice(1);
        state.quotesData = quotes.slice(1);
        
        // Extract families for the dropdown
        state.sheetFamilies = [...new Set(state.vaultAndStaysData.map(r => r[0]).filter(f => f && f.toLowerCase() !== 'everyone'))];

        await Promise.all([
            setVal('itin_cache', state.itineraryData),
            setVal('vault_cache', state.vaultAndStaysData),
            setVal('quotes_cache', state.quotesData)
        ]);
    } catch (e) {
        console.warn("Offline or Fetch Error - Using Cache");
        state.itineraryData = await getVal('itin_cache');
        state.vaultAndStaysData = await getVal('vault_cache');
        state.quotesData = await getVal('quotes_cache');
    }
}

// --- WEATHER ENGINE ---
export async function fetchWeather(lat, lon) {
    const API_KEY = '84f67c304d9e03d368e54737d2f4476a';
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        return await r.json();
    } catch(e) { return null; }
}

// --- QUOTE PERSISTENCE ---
export async function saveQuoteToSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbxeK98Y_Iu7fG7S6V6X-E9_mG-x_tW1G8K_N0J3F_O1N7_T_U/exec?action=addQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

export async function deleteQuoteFromSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbxeK98Y_Iu7fG7S6V6X-E9_mG-x_tW1G8K_N0J3F_O1N7_T_U/exec?action=deleteQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

// --- SYSTEM HELPERS ---
export function syncToCloud(type, data) {
    console.log(`Cloud Sync Triggered for ${type}`);
    // Future Webhook implementation goes here
}

export function initLiveCurrency() {
    // Placeholder for future live exchange rates
    console.log("Currency engine online.");
}

export function preCacheImages() {
    const imgs = ['./img/la.jpg', './img/utah.jpg', './img/vegas.jpg', './img/flights.jpg'];
    imgs.forEach(src => { const img = new Image(); img.src = src; });
}
