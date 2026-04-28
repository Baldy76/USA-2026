import { state, parseDateTime } from '../store.js';

export function updateFlap(id, newVal) {
    const el = document.getElementById(id); if (!el || el.innerText === newVal) return;
    el.classList.add('flipping'); setTimeout(() => { el.innerText = newVal; el.classList.remove('flipping'); }, 200);
}

export function updateTimeAndCountdown() { 
    const now = new Date();
    try {
        const timePT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(now);
        const timeMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }).format(now);
        if(document.getElementById('time-la')) document.getElementById('time-la').innerText = `🕒 ${timePT}`;
        if(document.getElementById('time-utah')) document.getElementById('time-utah').innerText = `🕒 ${timeMT}`;
        
        const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
        const [h, m] = ukTime.split(':');
        updateFlap('uk-hr', h); updateFlap('uk-min', m);
    } catch(e) {}
    renderUpNext();
}

export function renderUpNext() {
    const titleEl = document.getElementById('up-next-title');
    if (!titleEl || !state.itineraryData) return;
    const now = Date.now();
    let next = state.itineraryData.map(r => ({ act: r[2], time: parseDateTime(r[0], r[3]) }))
                .filter(r => r.time && r.time > now)
                .sort((a,b) => a.time - b.time)[0];
    titleEl.innerText = next ? next.act : "Trip Complete! ✈️";
}
