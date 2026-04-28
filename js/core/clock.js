import { state, parseDateTime } from '../store.js';
import { triggerConfetti } from './animations.js';

export function updateFlap(id, newVal) {
    const el = document.getElementById(id); if (!el || el.innerText === newVal) return;
    el.classList.remove('flipping'); void el.offsetWidth; el.classList.add('flipping'); setTimeout(() => { el.innerText = newVal; }, 200);
}

export function updateGreeting() {
    const user = localStorage.getItem('appUser'); let nameStr = (user && user !== 'All') ? ", " + user.split(' ')[0] : "";
    const hour = new Date().getHours(); let greetings = ["Good Night", "Vegas time", "City lights", "Time to relax"]; let sky = 'sky-night';
    if (hour >= 5 && hour < 12) { greetings = ["Good Morning", "Rise and shine", "Let's go"]; sky = 'sky-morning'; }
    else if (hour >= 12 && hour < 17) { greetings = ["Good Afternoon", "Adventure awaits"]; sky = 'sky-day'; }
    else if (hour >= 17 && hour < 20) { greetings = ["Good Evening", "Golden hour"]; sky = 'sky-evening'; }
    const titleEl = document.getElementById('greeting-title'); if (titleEl) titleEl.innerHTML = `${greetings[Math.floor(Math.random() * greetings.length)]}${nameStr}!`;
    const topCard = document.getElementById('dashboard-hero'); if (topCard) topCard.className = sky;
}

export function updateTimeAndCountdown() { 
    updateGreeting(); const now = new Date();
    const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: false };
    try {
        const timePT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' }).format(now);
        const timeMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' }).format(now);
        const elLA = document.getElementById('time-la'); if(elLA) elLA.innerText = `🕒 ${timePT}`;
        const elVegas = document.getElementById('time-vegas'); if(elVegas) elVegas.innerText = `🕒 ${timePT}`;
        const elUtah = document.getElementById('time-utah'); if(elUtah) elUtah.innerText = `🕒 ${timeMT}`;
        const clockDateEl = document.getElementById('clock-date'); if(clockDateEl) clockDateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    } catch(e) {}
    const savedStart = localStorage.getItem('tripStartDate'); const savedEnd = localStorage.getItem('tripEndDate');
    const progLabel = document.getElementById('trip-prog-label'); const progVal = document.getElementById('trip-prog-val'); const progBar = document.getElementById('trip-prog-bar');
    const cdDisplay = document.getElementById('countdown-display'); 
    const iconStart = document.getElementById('prog-icon-start'); const iconEnd = document.getElementById('prog-icon-end');
    const flyingPlane = document.getElementById('flying-plane');
    if (savedStart) {
        const tripStart = new Date(savedStart); tripStart.setHours(0,0,0,0);
        let tripEnd = savedEnd ? new Date(savedEnd) : new Date(tripStart.getTime() + (14 * 24 * 60 * 60 * 1000)); tripEnd.setHours(23,59,59,999);
        if (now < tripStart) {
            if(iconStart) iconStart.innerText = '🏠'; if(iconEnd) iconEnd.innerText = '🇺🇸';
            if(flyingPlane) { flyingPlane.innerText = '✈️'; flyingPlane.style.transform = 'scaleX(1)'; flyingPlane.style.display = 'block'; }
            const diff = tripStart - now; const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if(progLabel) progLabel.innerText = "Countdown"; updateFlap('cd-num', days.toString()); if(cdDisplay) cdDisplay.style.display = 'flex';
            if ([100, 50, 30, 10, 5, 1].includes(days) && !localStorage.getItem(`ms_${days}`)) { localStorage.setItem(`ms_${days}`, 'true'); setTimeout(triggerConfetti, 1500); }
            if(progBar) { if (days > 100) { progBar.style.width = '0%'; } else { const percent = 100 - days; progBar.style.width = `${percent}%`; } }
        } else if (now >= tripStart && now <= tripEnd) {
            if(iconStart) iconStart.innerText = '🇺🇸'; if(iconEnd) iconEnd.innerText = '🏠';
            if(flyingPlane) { flyingPlane.innerText = '✈️'; flyingPlane.style.transform = 'scaleX(-1)'; flyingPlane.style.display = 'block'; }
            const totalDuration = tripEnd - tripStart; const elapsed = now - tripStart;
            let percent = (elapsed / totalDuration) * 100; if(percent > 100) percent = 100;
            const dayNum = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;
            if(progLabel) progLabel.innerText = "Trip Progress"; if(progVal) progVal.innerText = `Day ${dayNum}`;
            if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) { progBar.style.width = `${percent}%`; }
        } else {
            if(progLabel) progLabel.innerText = "Trip Complete"; if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) progBar.style.width = '100%';
        }
    }
    try {
        const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
        let localTz = (activeTab === 'utah') ? 'America/Denver' : 'America/Los_Angeles';
        const ukTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/London' }).format(now);
        const localTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: localTz }).format(now);
        const ukMatch = ukTimeStr.match(/(\d{2})[^\d](\d{2})/); if(ukMatch) { updateFlap('uk-hr', ukMatch[1]); updateFlap('uk-min', ukMatch[2]); }
        const locMatch = localTimeStr.match(/(\d{2})[^\d](\d{2})/); if(locMatch) { updateFlap('loc-hr', locMatch[1]); updateFlap('loc-min', locMatch[2]); }
    } catch(e) {}
    renderUpNext();
}

export function renderUpNext() {
    const titleEl = document.getElementById('up-next-title'); const timeEl = document.getElementById('up-next-time');
    if (!titleEl || !timeEl || !state.itineraryData) return;
    const now = new Date().getTime(); const filter = localStorage.getItem('appUser') || 'All';
    let upcoming = [];
    state.itineraryData.forEach(cols => {
        const taskTime = parseDateTime(cols[0], cols[3] || '23:59');
        if (taskTime && taskTime > now) upcoming.push({ act: cols[2], time: cols[3] || 'TBD', loc: cols[1], timestamp: taskTime });
    });
    if (upcoming.length > 0) {
        upcoming.sort((a, b) => a.timestamp - b.timestamp);
        const next = upcoming[0]; titleEl.innerText = next.act; timeEl.innerText = `${next.time} • ${next.loc}`;
    } else { titleEl.innerText = "Trip Complete!"; }
}
