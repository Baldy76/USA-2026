export const state = {
    itineraryData: null, vaultAndStaysData: null, quotesData: null,
    gateOverrides: {}, sheetFamilies: []
};
export function setVal(k, v) { return window.localforage.setItem(k, v); }
export function getVal(k) { return window.localforage.getItem(k); }
export function escapeHTML(s) { if(!s) return ""; const p = document.createElement('p'); p.textContent = s; return p.innerHTML; }
export function parseDateTime(d, t) {
    if(!d) return null;
    const combined = d + (t && t.toLowerCase() !== 'tbd' ? ' ' + t : ' 23:59');
    const res = new Date(combined); return isNaN(res.getTime()) ? null : res.getTime();
}
