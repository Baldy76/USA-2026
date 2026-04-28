
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
    const iconStart = document.getElementById('prog-icon-start'); 
    const iconEnd = document.getElementById('prog-icon-end');
    const flyingPlane = document.getElementById('flying-plane');
    
    if (savedStart) {
        const tripStart = new Date(savedStart); tripStart.setHours(0,0,0,0);
        let tripEnd = savedEnd ? new Date(savedEnd) : new Date(tripStart.getTime() + (14 * 24 * 60 * 60 * 1000)); tripEnd.setHours(23,59,59,999);
        const inputStart = document.getElementById('trip-start-date'); if(inputStart) inputStart.value = savedStart;
        const inputEnd = document.getElementById('trip-end-date'); if(inputEnd) inputEnd.value = savedEnd || '';

        if (now < tripStart) {
            if(iconStart) iconStart.innerText = '🏠'; 
            if(iconEnd) iconEnd.innerText = '🇺🇸';
            if(flyingPlane) { flyingPlane.innerText = '✈️'; flyingPlane.style.transform = 'scaleX(1)'; flyingPlane.style.display = 'block'; }
            
            const diff = tripStart - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if(progLabel) progLabel.innerText = "Countdown";
            
            updateFlap('cd-num', days.toString()); if(cdDisplay) cdDisplay.style.display = 'flex';
            
            const msKey = `milestone_${days}`;
            if ([100, 50, 30, 10, 5, 1].includes(days) && !localStorage.getItem(msKey)) {
                localStorage.setItem(msKey, 'true');
                setTimeout(triggerConfetti, 1500);
            }

            if(progBar) { 
                if (days > 100) { 
                    progBar.style.width = '0%'; if(progVal) progVal.innerText = "Waiting for 100 Day mark..."; 
                } else { 
                    const percent = 100 - days; progBar.style.width = `${percent}%`; progBar.style.background = '#34c759'; 
                    if(progVal) progVal.innerText = `100-Day Milestone: ${percent}% Complete`; 
                }
            }
        } else if (now >= tripStart && now <= tripEnd) {
            if(iconStart) iconStart.innerText = '🇺🇸'; 
            if(iconEnd) iconEnd.innerText = '🏠';
            if(flyingPlane) { flyingPlane.innerText = '✈️'; flyingPlane.style.transform = 'scaleX(-1)'; flyingPlane.style.display = 'block'; }
            
            const totalDuration = tripEnd - tripStart; const elapsed = now - tripStart;
            let percent = (elapsed / totalDuration) * 100; if(percent > 100) percent = 100;
            const dayNum = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1; const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
            
            if(progLabel) progLabel.innerText = "Trip Progress"; if(progVal) progVal.innerText = `Day ${dayNum} of ${totalDays}`;
            if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) { progBar.style.width = `${percent}%`; progBar.style.background = '#ffd60a'; }
        } else {
            if(iconStart) iconStart.innerText = '🏠'; 
            if(iconEnd) iconEnd.innerText = '🇺🇸';
            if(flyingPlane) flyingPlane.style.display = 'none';
            if(progLabel) progLabel.innerText = "Trip Complete"; if(progVal) progVal.innerText = `Hope you had fun!`;
            if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) { progBar.style.width = `100%`; progBar.style.background = '#34c759'; }
        }
    } else {
        if(iconStart) iconStart.innerText = '🏠'; 
        if(iconEnd) iconEnd.innerText = '✈️';
        if(flyingPlane) flyingPlane.style.display = 'none';
        if(progLabel) progLabel.innerText = "No Trip Date Set"; if(progVal) progVal.innerText = "Go to Settings";
        if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) progBar.style.width = '0%';
    }
    
    try {
        const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
        let localTz = 'America/Los_Angeles'; let localTzLabel = '🇺🇸 LOCAL (PT)';
        if (activeTab === 'utah') { localTz = 'America/Denver'; localTzLabel = '🇺🇸 LOCAL (MT)'; }
        
        const ukTimeStr = new Intl.DateTimeFormat('en-GB', { ...timeOpts, timeZone: 'Europe/London' }).format(now);
        const localTimeStr = new Intl.DateTimeFormat('en-GB', { ...timeOpts, timeZone: localTz }).format(now);
        const ukMatch = ukTimeStr.match(/(\d{1,2})[^\d](\d{2})/); if(ukMatch) { updateFlap('uk-hr', ukMatch[1].padStart(2, '0')); updateFlap('uk-min', ukMatch[2]); }
        const locMatch = localTimeStr.match(/(\d{1,2})[^\d](\d{2})/); if(locMatch) { updateFlap('loc-hr', locMatch[1].padStart(2, '0')); updateFlap('loc-min', locMatch[2]); }
        const tzEl = document.getElementById('local-tz-label'); if(tzEl) tzEl.innerText = localTzLabel;

        const ukHour = parseInt(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' }).format(now));
        const dot = document.getElementById('uk-status-dot');
        if (dot) {
            if (ukHour >= 8 && ukHour < 22) {
                dot.style.background = '#34c759'; 
                dot.style.boxShadow = '0 0 6px #34c759';
            } else {
                dot.style.background = '#ff3b30'; 
                dot.style.boxShadow = '0 0 6px #ff3b30';
            }
        }
    } catch(e) {}
    renderUpNext();
}

export function saveTripSettings() { localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); localStorage.setItem('tripEndDate', document.getElementById('trip-end-date').value); updateTimeAndCountdown(); }

export function renderUpNext() {
    const titleEl = document.getElementById('up-next-title'); const timeEl = document.getElementById('up-next-time');
    if (!titleEl || !timeEl) return;
    if (!state.itineraryData || state.itineraryData.length === 0) { titleEl.innerText = "No upcoming plans"; timeEl.innerText = "Add something to the sheet!"; return; }

    const now = new Date().getTime(); const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    let upcoming = [];
    state.itineraryData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim();
        let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true;
        else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true;
        else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true;
        else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

        if (isMatch) {
            const taskTime = parseDateTime(d, time || '23:59');
            if (taskTime && taskTime > now) upcoming.push({ act, time: time || 'TBD', loc, timestamp: taskTime, date: d });
        }
    });

    if (upcoming.length > 0) {
        upcoming.sort((a, b) => a.timestamp - b.timestamp);
        const next = upcoming[0]; titleEl.innerText = next.act;
        const isToday = new Date(next.timestamp).toDateString() === new Date().toDateString();
        let locFormat = "📍 " + (next.loc.toLowerCase().includes('la') ? 'LA' : next.loc.toLowerCase().includes('utah') ? 'Utah' : next.loc.toLowerCase().includes('vegas') ? 'Vegas' : next.loc);
        timeEl.innerText = `${isToday ? "Today" : next.date} @ ${next.time} • ${locFormat}`;
    } else {
        titleEl.innerText = "Trip Complete!"; timeEl.innerText = "Time to go home ✈️";
    }
}
