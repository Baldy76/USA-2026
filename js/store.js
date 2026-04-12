// GLOBAL STATE
export const state = {
    itineraryData: [],
    vaultAndStaysData: [],
    sheetFamilies: new Set(),
    liveExchangeRate: 1.27
};

// INDEXED-DB WRAPPER
const DB_NAME = 'HolidayPlannerDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e);
    });
};

export const setVal = async (key, val) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
    });
};

export const getVal = async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject();
    });
};

// UTILITIES
export const escapeHTML = (str) => {
    if (!str) return "";
    return String(str).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'"); 
};

export const parseDateTime = (dateStr, timeStr = '') => {
    dateStr = dateStr ? dateStr.trim() : ''; timeStr = timeStr ? timeStr.trim() : '';
    if(!dateStr) return 0;
    let d = new Date(`${dateStr} ${timeStr}`.trim());
    if (isNaN(d)) {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) d = new Date(`${parts[2]}/${parts[1]}/${parts[0]} ${timeStr}`);
    }
    return isNaN(d) ? 0 : d.getTime();
};

export function parseCSV(str) {
    const arr = []; let quote = false; let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr;
}
