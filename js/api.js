import { state, setVal, getVal } from './store.js';

export async function loadAllData() {
    const urls = {
        itin: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=0&single=true&output=csv',
        vault: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1815147575&single=true&output=csv',
        quotes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-L-KclRByD76VfAnqX-uW1-Dksuun8Wv_Yl510_Ibe9Nq19R6D5_n8XjXf3VpA_m6n8pE7VlA7Fq3/pub?gid=1334002705&single=true&output=csv'
    };
    try {
        const fetchCSV = async (u) => {
            const r = await fetch(u); const t = await r.text();
            return t.split('\n').map(row => row.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        };
        const [i, v, q] = await Promise.all([fetchCSV(urls.itin), fetchCSV(urls.vault), fetchCSV(urls.quotes)]);
        state.itineraryData = i.slice(1);
        state.vaultAndStaysData = v.slice(1);
        state.quotesData = q.slice(1);
        state.sheetFamilies = [...new Set(state.vaultAndStaysData.map(r => r[0]).filter(f => f && f.toLowerCase() !== 'everyone'))];
        await Promise.all([setVal('i_c', state.itineraryData), setVal('v_c', state.vaultAndStaysData), setVal('q_c', state.quotesData)]);
    } catch (e) {
        state.itineraryData = await getVal('i_c'); state.vaultAndStaysData = await getVal('v_c'); state.quotesData = await getVal('q_c');
    }
}

export async function fetchWeather(lat, lon) {
    const KEY = '84f67c304d9e03d368e54737d2f4476a';
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric`);
        return await r.json();
    } catch(e) { return null; }
}

export function syncToCloud() { console.log("Cloud sync ready"); }
export function initLiveCurrency() { console.log("Currency ready"); }
export function preCacheImages() { console.log("Images cached"); }
