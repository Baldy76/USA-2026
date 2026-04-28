import { state, parseDateTime } from '../store.js';

export function updateTimeAndCountdown() {
    const now = new Date();
    const start = localStorage.getItem('tripStartDate');
    if (start) {
        const diff = new Date(start) - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const el = document.getElementById('cd-num');
        if(el) el.innerText = days > 0 ? days : 0;
    }
    renderUpNext();
}

export function renderUpNext() {
    const el = document.getElementById('up-next-title');
    if (!el || !state.itineraryData) return;
    const now = Date.now();
    const next = state.itineraryData
        .map(r => ({ act: r[2], time: parseDateTime(r[0], r[3]) }))
        .filter(r => r.time && r.time > now)
        .sort((a,b) => a.time - b.time)[0];
    el.innerText = next ? `Next: ${next.act}` : "No more plans! ✈️";
}
