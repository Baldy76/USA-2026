import { state, setVal, getVal, parseCSV, parseDateTime } from './store.js';

const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';
const vaultUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=96079970&single=true&output=csv';

// ---- MULTIPLAYER SYNC ENGINE ----
export const SYNC_URL = "https://script.google.com/macros/s/AKfycbyjyYf54mXK9y6RfeTn7gimNIwN5X0kBA4TqeymYc3WKhtOpprcpJ4xb51bbJQZ7wWh/exec"; 

export async function syncToCloud(payloadType, data) {
    if (!SYNC_URL || !navigator.onLine) return; 
    try {
        fetch(SYNC_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: payloadType, payload: data, timestamp: Date.now() })
        });
    } catch(e) { console.warn('Cloud sync failed'); }
}

// ---- DATA FETCHING ----
export async function loadAllData() {
    let itinData = '';
    let vData = '';

    try {
        const cacheBuster = `&t=${Date.now()}`;
        const [itineraryRes, vaultRes] = await Promise.all([ fetch(sheetUrl + cacheBuster), fetch(vaultUrl + cacheBuster) ]);
        if (!itineraryRes.ok || !vaultRes.ok) throw new Error("Google Sheets error.");
        
        itinData = await itineraryRes.text();
        vData = await vaultRes.text();
        
        await setVal('offline_itinerary', itinData);
        await setVal('offline_vault', vData);
    } catch (e) { 
        console.warn("[OFFLINE MODE] Loading backup data from IndexedDB..."); 
        itinData = await getVal('offline_itinerary') || '';
        vData = await getVal('offline_vault') || '';
        if (!itinData && !vData) return false;
    }

    state.sheetFamilies.clear(); 

    if (itinData) {
        state.itineraryData = parseCSV(itinData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
        state.itineraryData.sort((a, b) => (a.length < 5 || b.length < 5) ? 0 : parseDateTime(a[0], a[3]) - parseDateTime(b[0], b[3]));
        state.itineraryData.forEach(col => { if (col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') state.sheetFamilies.add(col[4].trim()); });
    }
    if (vData) {
        state.vaultAndStaysData = parseCSV(vData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
        state.vaultAndStaysData.forEach(col => { if (col.length > 0 && col[0].trim().toLowerCase() !== 'everyone') state.sheetFamilies.add(col[0].trim()); });
    }
    return true;
}

export async function preCacheImages() {
    if ('caches' in window) {
        try {
            const cache = await caches.open('holiday-planner-v2.1.13');
            const imgUrls = state.vaultAndStaysData
                .map(cols => cols[7] ? cols[7].trim() : '')
                .filter(url => url.startsWith('http'));
            
            if (imgUrls.length > 0) {
                imgUrls.forEach(url => {
                    cache.match(url).then(res => {
                        if (!res) fetch(url, { mode: 'no-cors' }).then(response => cache.put(url, response)).catch(() => {});
                    });
                });
            }
        } catch (e) {}
    }
}

export async function initLiveCurrency() {
    try {
        const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
        const data = await res.json();
        if (data.rates && data.rates.USD) {
            state.liveExchangeRate = data.rates.USD;
            const tag = document.getElementById('live-rate-tag');
            if(tag) tag.innerText = `RATE: £1 = $${state.liveExchangeRate.toFixed(2)}`;
        }
    } catch (e) {}
}

const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969";
export async function fetchWeather(lat, lon) {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${W_API_KEY}&units=metric`);
    if(!res.ok) throw new Error("API Error");
    const d = await res.json();
    const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${W_API_KEY}&units=metric`);
    const fData = await fRes.json();
    return { current: d, forecast: fData };
}
