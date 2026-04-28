import { state, setVal, getVal } from './store.js';

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
        state.sheetFamilies = [...new Set(state.vaultAndStaysData.map(r => r[0]).filter(f => f && f.toLowerCase() !== 'everyone'))];

        await Promise.all([
            setVal('itin_cache', state.itineraryData),
            setVal('vault_cache', state.vaultAndStaysData),
            setVal('quotes_cache', state.quotesData)
        ]);
    } catch (e) {
        state.itineraryData = await getVal('itin_cache');
        state.vaultAndStaysData = await getVal('vault_cache');
        state.quotesData = await getVal('quotes_cache');
    }
}

export async function saveQuoteToSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbz_K9pM6R8Zf7PZ6Z6Z6Z6Z6Z6Z6Z6Z6Z/exec?action=addQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

export async function deleteQuoteFromSheet(loc, text, author) {
    const url = `https://script.google.com/macros/s/AKfycbz_K9pM6R8Zf7PZ6Z6Z6Z6Z6Z6Z6Z6Z6Z/exec?action=deleteQuote&location=${encodeURIComponent(loc)}&quote=${encodeURIComponent(text)}&author=${encodeURIComponent(author)}`;
    return fetch(url, { mode: 'no-cors' });
}

export function syncToCloud(type, data) {
    console.log("Syncing:", type, data);
}

export function initLiveCurrency() {
    console.log("Currency Loaded");
}

export function preCacheImages() {
    console.log("Images Cached");
}
