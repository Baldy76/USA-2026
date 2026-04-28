export const state = {
    itineraryData: null,
    vaultAndStaysData: null,
    quotesData: null,
    gateOverrides: {},
    sheetFamilies: []
};

export function setVal(k, v) { return window.localforage.setItem(k, v); }
export function getVal(k) { return window.localforage.getItem(k); }

export function escapeHTML(str) {
    if (!str) return "";
    const p = document.createElement('p'); p.textContent = str; return p.innerHTML;
}

export function parseDateTime(dStr, tStr) {
    if (!dStr) return null;
    let combined = dStr + (tStr && tStr.toLowerCase() !== 'tbd' ? ' ' + tStr : ' 23:59');
    const d = new Date(combined); return isNaN(d.getTime()) ? null : d.getTime();
}
