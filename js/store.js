export const state = {
    itineraryData: null,
    vaultAndStaysData: null,
    quotesData: null,
    gateOverrides: {},
    sheetFamilies: []
};

export function setVal(key, val) { return window.localforage.setItem(key, val); }
export function getVal(key) { return window.localforage.getItem(key); }

export function escapeHTML(str) {
    if (!str) return "";
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

export function parseDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    let combined = dateStr;
    if (timeStr && timeStr.toLowerCase() !== 'tbd') {
        combined += ' ' + timeStr;
    } else {
        combined += ' 23:59';
    }
    const d = new Date(combined);
    return isNaN(d.getTime()) ? null : d.getTime();
}
