import { get, set } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

export const state = {
    itineraryData: null,
    vaultAndStaysData: null,
    sheetFamilies: [],
    quotesData: [],
    gateOverrides: {},
    liveExchangeRate: 1.25
};

export async function getVal(key) { 
    return await get(key); 
}

export async function setVal(key, val) { 
    return await set(key, val); 
}

// THE FIX: Proper HTML escaping to prevent crashes
export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// THE FIX: Safe date parsing
export function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr} ${timeStr || '00:00'}`);
    return isNaN(d.getTime()) ? null : d.getTime();
}
