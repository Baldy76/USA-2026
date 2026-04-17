export const state = {
    itineraryData: null,
    vaultAndStaysData: null,
    sheetFamilies: [],
    quotesData: [],
    gateOverrides: {},
    liveExchangeRate: 1.25
};

export async function getVal(key) { 
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
    } catch(e) {
        return null;
    }
}

export async function setVal(key, val) { 
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch(e) {
        console.error("Local storage error:", e);
    }
}

export function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr} ${timeStr || '00:00'}`);
    return isNaN(d.getTime()) ? null : d.getTime();
}
