import { state, setVal, getVal, escapeHTML, parseDateTime } from './store.js?v=6.2.0';
import { fetchWeather, syncToCloud, saveQuoteToSheet } from './api.js?v=6.2.0';

export function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
    const btnLight = document.getElementById('btnLight'); const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    updateMetaThemeColor(document.querySelector('.tab-content.active')?.id || 'home');
}
export function setThemeMode(isDark) { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); }

export function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ffcc00';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = metaColor;
}

function updateFlap(id, newVal) {
    const el = document.getElementById(id);
    if (!el || el.innerText === newVal) return;
    el.classList.remove('flipping'); void el.offsetWidth; el.classList.add('flipping');
    setTimeout(() => { el.innerText = newVal; }, 200);
}

export function updateGreeting() {
    const user = localStorage.getItem('appUser');
    let nameStr = (user && user !== 'All') ? ", " + user.split(' ')[0] : "";
    const hour = new Date().getHours();
    let greetings = ["Good Night", "Vegas time", "City lights", "Time to relax"]; let sky = 'sky-night';
    if (hour >= 5 && hour < 12) { greetings = ["Good Morning", "Rise and shine", "Let's go"]; sky = 'sky-morning'; }
    else if (hour >= 12 && hour < 17) { greetings = ["Good Afternoon", "Adventure awaits"]; sky = 'sky-day'; }
    else if (hour >= 17 && hour < 20) { greetings = ["Good Evening", "Golden hour"]; sky = 'sky-evening'; }
    const titleEl = document.getElementById('greeting-title');
    if (titleEl) titleEl.innerHTML = `${greetings[Math.floor(Math.random() * greetings.length)]}${nameStr}!`;
    const topCard = document.getElementById('dashboard-hero');
    if (topCard) { topCard.className = sky; }
}

export function updateTimeAndCountdown() {
    const now = new Date();
    updateGreeting();
    
    const savedStart = localStorage.getItem('tripStartDate');
    const savedEnd = localStorage.getItem('tripEndDate');
    const progBar = document.getElementById('trip-prog-bar');
    const cdDisplay = document.getElementById('countdown-display');
    const progLabel = document.getElementById('trip-prog-label');
    const progVal = document.getElementById('trip-prog-val');
    
    if (savedStart) {
        const tripStart = new Date(savedStart); tripStart.setHours(0,0,0,0);
        let tripEnd = savedEnd ? new Date(savedEnd) : new Date(tripStart.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        if (now < tripStart) {
            const days = Math.ceil((tripStart - now) / (1000 * 60 * 60 * 24));
            updateFlap('cd-num', days.toString());
            if(cdDisplay) cdDisplay.style.display = 'flex';
            if(progLabel) progLabel.innerText = "Countdown";
            
            if(progBar) { 
                if (days > 100) {
                    progBar.style.width = '0%';
                    if(progVal) progVal.innerText = "Waiting for 100 Day mark...";
                } else {
                    const progressPercent = 100 - days;
                    progBar.style.width = `${progressPercent}%`; 
                    progBar.style.background = '#34c759'; 
                    if(progVal) progVal.innerText = `100-Day Milestone: ${progressPercent}% Complete`;
                }
            }
        } else {
            if(cdDisplay) cdDisplay.style.display = 'none';
            const total = tripEnd - tripStart; const elapsed = now - tripStart;
            let percent = Math.min(100, (elapsed / total) * 100);
            if(progBar) {
                progBar.style.width = `${percent}%`;
                progBar.style.background = '#ffd60a'; 
            }
            if(progLabel) progLabel.innerText = "Trip Progress";
            if(progVal) progVal.innerText = `Day ${Math.floor(elapsed/(864e5))+1}`;
        }
    }

    const ukTime = new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/London' }).format(now).split(':');
    updateFlap('uk-hr', ukTime[0]); updateFlap('uk-min', ukTime[1]);

    const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
    const locTz = activeTab === 'utah' ? 'America/Denver' : 'America/Los_Angeles';
    const locTime = new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:locTz }).format(now).split(':');
    updateFlap('loc-hr', locTime[0]); updateFlap('loc-min', locTime[1]);
    const dateEl = document.getElementById('clock-date');
    if(dateEl) dateEl.innerText = now.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
    
    try {
        const timePT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' }).format(now);
        const timeMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' }).format(now);
        const elLA = document.getElementById('time-la'); if(elLA) elLA.innerText = `🕒 ${timePT}`;
        const elVegas = document.getElementById('time-vegas'); if(elVegas) elVegas.innerText = `🕒 ${timePT}`;
        const elUtah = document.getElementById('time-utah'); if(elUtah) elUtah.innerText = `🕒 ${timeMT}`;
    } catch(e) {}

    renderUpNext();
}

export function saveTripSettings() { 
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
    localStorage.setItem('tripEndDate', document.getElementById('trip-end-date').value); 
    updateTimeAndCountdown(); 
}

export function renderUpNext() {
    const titleEl = document.getElementById('up-next-title');
    const timeEl = document.getElementById('up-next-time');
    if (!titleEl || !timeEl) return;
    if (!state.itineraryData || state.itineraryData.length === 0) return;

    const now = new Date().getTime();
    const filter = localStorage.getItem('appUser') || 'All';
    let upcoming = [];
    state.itineraryData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim();
        const taskTime = parseDateTime(d, time || '23:59');
        if (taskTime && taskTime > now) upcoming.push({ act, time: time || 'TBD', loc, timestamp: taskTime, date: d });
    });

    if (upcoming.length > 0) {
        upcoming.sort((a, b) => a.timestamp - b.timestamp);
        const next = upcoming[0];
        titleEl.innerText = next.act;
        const isToday = new Date(next.timestamp).toDateString() === new Date().toDateString();
        let locFormat = "📍 " + (next.loc.toLowerCase().includes('la') ? 'LA' : next.loc.toLowerCase().includes('utah') ? 'Utah' : next.loc.toLowerCase().includes('vegas') ? 'Vegas' : next.loc);
        timeEl.innerText = `${isToday ? "Today" : next.date} @ ${next.time} • ${locFormat}`;
    } else {
        titleEl.innerText = "Trip Complete!"; timeEl.innerText = "Time to go home ✈️";
    }
}

export function convertCurrency() { 
    const usdInput = document.getElementById('usd-input');
    const usd = parseFloat(usdInput?.value);
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    document.getElementById('clear-usd').style.display = usdInput?.value ? 'flex' : 'none';
    if(document.getElementById('gbp-output')) document.getElementById('gbp-output').innerText = isNaN(usd) ? `£0.00` : `£${(usd / rate).toFixed(2)}`;
}

export let currentTipPercent = 18;
export function setTip(percent, btnElement) { currentTipPercent = percent; document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active')); if(btnElement) btnElement.classList.add('active'); calculateTip(); }
export function calculateTip() { 
    const b = parseFloat(document.getElementById('bill-total')?.value) || 0;
    const splitBtn = document.querySelector('.split-btn.active');
    const s = splitBtn ? parseInt(splitBtn.dataset.split) : 2;
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    const t = b * (1 + (currentTipPercent / 100)), usd = t / s, gbp = usd / rate; 
    if(document.getElementById('tip-usd')) document.getElementById('tip-usd').innerText = `$${usd.toFixed(2)}`;
    if(document.getElementById('tip-gbp')) document.getElementById('tip-gbp').innerText = `£${gbp.toFixed(2)}`;
}

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    new Set(state.sheetFamilies || []).forEach(f => { const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt); });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { localStorage.setItem('appUser', document.getElementById('family-selector').value); renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); renderUpNext(); }
export function clearCustomFamilies() { if(confirm("Clear memory?")) { localStorage.removeItem('appUser'); window.location.reload(); } }

export async function initWeatherPill() {
    const loadSummary = async (lat, lon, id) => {
        try { const data = await fetchWeather(lat, lon); document.getElementById(id).innerHTML = `${getWeatherIcon(data.current.weather[0].icon)} ${Math.round(data.current.main.temp)}°`; } catch(e) { document.getElementById(id).innerHTML = '🚫'; }
    };
    loadSummary(34.0522, -118.2437, 'wp-la'); loadSummary(37.0965, -113.5684, 'wp-utah'); loadSummary(36.1699, -115.1398, 'wp-vegas');
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => loadSummary(pos.coords.latitude, pos.coords.longitude, 'wp-local'), err => document.getElementById('wp-local').innerHTML = '🚫');
}

export async function setWeatherCity(target) {
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-w-${target}`).classList.add('active');
    document.getElementById('WTH-dashboard').innerHTML = `<div class="empty-state">⏳ Syncing...</div>`;
    try {
        let lat = 34.0522, lon = -118.2437, locName = "Los Angeles", tz = 'America/Los_Angeles';
        if (target === 'utah') { lat = 37.0965; lon = -113.5684; locName = "Utah"; tz = 'America/Denver'; }
        else if (target === 'vegas') { lat = 36.1699; lon = -115.1398; locName = "Las Vegas"; }
        const data = await fetchWeather(lat, lon); renderWeatherDOM(data, locName, tz);
    } catch(e) { document.getElementById('WTH-dashboard').innerHTML = `<div class="empty-state">🚫 Offline</div>`; }
}

export function openWeatherModal() { document.body.classList.add('no-scroll'); document.getElementById('weather-modal').style.display = 'flex'; setTimeout(() => document.getElementById('weather-modal').classList.add('active'), 10); setWeatherCity('la'); }
export function closeWeatherModal() { document.getElementById('weather-modal').classList.remove('active'); setTimeout(() => { document.getElementById('weather-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

function renderWeatherDOM(data, fallbackName, tz) {
    const d = data.current; const locName = fallbackName || d.name;
    const timeOpts = tz ? {hour: '2-digit', minute:'2-digit', timeZone: tz} : {hour: '2-digit', minute:'2-digit'};
    const sunset = new Date(d.sys.sunset * 1000);
    const diff = sunset - Date.now();
    let daylightText = diff > 0 ? `☀️ ${Math.floor(diff/36e5)}h ${Math.floor((diff%36e5)/6e4)}m left` : "Sun has set 🌙";
    
    document.getElementById('WTH-dashboard').innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,122,255,0.05)); border-radius: 20px; padding: 30px 20px; text-align: center; margin-bottom: 20px; border: 2px solid var(--accent);">
            <div style="font-size: 70px;">${getWeatherIcon(d.weather[0].icon)}</div>
            <div style="font-size: 48px; font-weight: 900; color: var(--accent); margin: 10px 0;">${Math.round(d.main.temp)}°C</div>
            <div style="opacity: 0.5; font-weight: 900;">📍 ${escapeHTML(locName)}</div>
        </div>
        <div style="background: var(--bg); border-radius: 16px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-around; text-align: center; border: 1px solid var(--ios-grey);">
            <div><div style="font-size: 11px; opacity: 0.5;">SUNRISE</div><div style="font-size: 15px; font-weight: 900;">${new Date(d.sys.sunrise * 1000).toLocaleTimeString([], timeOpts)}</div></div>
            <div style="width: 1px; background: var(--ios-grey);"></div>
            <div><div style="font-size: 11px; opacity: 0.5;">SUNSET</div><div style="font-size: 15px; font-weight: 900;">${sunset.toLocaleTimeString([], timeOpts)}</div></div>
        </div>
        <div style="text-align: center; font-size: 14px; font-weight: 900; color: var(--accent); margin-bottom: 20px; background: var(--card); padding: 10px; border-radius: 12px; border: 1px solid var(--ios-grey);">${daylightText}</div>
    `;
}

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨' }; return m[c] || '🌤️'; };

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    const sortedData = [...state.itineraryData].sort((a, b) => parseDateTime(a[0], a[3] || '23:59') - parseDateTime(b[0], b[3] || '23:59'));

    sortedData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim(); const addr = (cols.length >= 6) ? (cols[5] || '').trim() : '';
        
        let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true; 
        else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true; 
        else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

        if (isMatch) {
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            const cardHtml = `
                <div class="timeline-card-wrapper ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="admin-card itin-card ${isCompleted?'completed':''}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding: 20px; margin-bottom: 16px; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 15px;">${escapeHTML(time)}</strong>
                            <span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">${escapeHTML(who)}</span>
                        </div>
                        <div style="font-size: 17px; font-weight: 900; line-height: 1.3;">${escapeHTML(act)}</div>
                        ${addr ? `<div style="font-size: 13px; font-weight: 700; opacity: 0.7; margin-top: 10px;"><a href="https://www.google.com/maps/search/?api=1&query=$6{encodeURIComponent(addr)}" target="_blank" style="color: var(--accent); text-decoration: none;">📍 Get Directions</a></div>` : ''}
                    </div>
                </div>`;
            const pg = (city, date) => { if (!grouped[city][date]) grouped[city][date] = []; grouped[city][date].push(cardHtml); };
            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : pg('la', d); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : pg('utah', d); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : pg('vegas', d); }
        }
    });

    const buildSec = (cityObj) => {
        let html = ''; for (const [date, cards] of Object.entries(cityObj)) {
            html += `<details class="day-group" open><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}</span></summary><div class="day-content timeline">${cards.join('')}</div></details>`;
        } return html;
    };
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); 
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); 
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); 
    document.querySelectorAll('.completed-section').forEach(sec => { sec.style.display = sec.querySelector('.timeline')?.innerHTML ? 'block' : 'none'; });
}

export function renderTravelVault() { 
    if (!state.vaultAndStaysData) return;
    const display = document.getElementById('flights-vault-display');
    let html = ''; const sortedData = [...state.vaultAndStaysData].sort((a,b) => parseDateTime(a[2]||'', null) - parseDateTime(b[2]||'', null));
    sortedData.forEach(cols => {
        if(!cols || cols.length < 2) return; 
        const type = (cols[1] || '').trim().toLowerCase(); 
        if (type === 'flight' || type === 'car') {
            const date = escapeHTML(cols[2]?.trim() || ''); const airline = escapeHTML(cols[5]?.trim().toUpperCase() || ''); const fnum = escapeHTML(cols[6]?.trim() || '');
            const flightId = btoa(encodeURIComponent(`${date}-${airline}-${fnum}`)).replace(/=/g, ''); 
            const activeTerm = (state.gateOverrides && state.gateOverrides[flightId]) ? state.gateOverrides[flightId] : escapeHTML(cols[8]?.trim() || '');
            html += `<div class="flip-container travel-card"><div class="flip-card-inner"><div class="flip-front" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; padding:20px; border-radius:24px;"><div style="font-size: 11px; font-weight: 900; opacity: 0.7;">✈️ ${type.toUpperCase()} • ${date}</div><strong style="font-size: 22px; display:block; margin: 10px 0;">${escapeHTML(cols[3])} → ${escapeHTML(cols[4])}</strong><div style="font-weight: 800; opacity:0.8;">${airline} ${fnum}</div></div><div class="flip-back" style="padding:20px;"><div style="font-size: 11px; font-weight: 800; opacity: 0.5;">TERMINAL / GATE</div><div style="font-size: 20px; font-weight: 900; color: #ffd60a; margin: 10px 0;">${activeTerm || 'Check Board'}</div><button class="edit-gate-btn action-btn" data-flightid="${flightId}" style="font-size:11px; padding:8px;">✏️ Edit Gate</button></div></div></div>`;
        }
    }); display.innerHTML = html; 
}

export function renderAccommodations() { 
    if (!state.vaultAndStaysData) return;
    let htmlLA = '', htmlUtah = '', htmlVegas = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 2) return; const fam = (cols[0] || '').trim(); const type = (cols[1] || '').trim().toLowerCase(); 
        if (type === 'stay') {
            const addr = cols[4]?.trim() || ''; const img = cols[7]?.trim() || '';
            const ui = `<div class="admin-card stay-card" data-fam="${escapeHTML(fam)}" data-addr="${escapeHTML(addr)}" data-map="https://www.google.com/maps/search/?api=1&query=$7{encodeURIComponent(addr)}" data-link="${escapeHTML(cols[6]||'')}" data-img="${escapeHTML(img)}" style="padding: 0; overflow: hidden; margin-bottom: 24px; cursor: pointer;"><div style="height: 100px; background: ${img?`url('${img}') center/cover`:`var(--accent)`}; display: flex; align-items: flex-end; padding: 20px;"><h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3></div></div>`;
            const city = cols[3] || '';
            if(city.toLowerCase().includes('la')) htmlLA += ui; else if(city.toLowerCase().includes('utah')) htmlUtah += ui; else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;
        }
    });
    document.getElementById('la-home-card').innerHTML = htmlLA; document.getElementById('utah-home-card').innerHTML = htmlUtah; document.getElementById('vegas-home-card').innerHTML = htmlVegas;
}

export async function renderWallet() {
    const docs = await getVal('offline_docs') || []; const gallery = document.getElementById('wallet-gallery'); if(!gallery) return;
    let html = docs.map(doc => `<div class="wallet-item" style="background: ${doc.type.startsWith('image/')?`url(${doc.data})`:'var(--ios-grey)'}; background-size:cover;"><button class="delete-doc-btn" data-id="${doc.id}">×</button><a href="${doc.data}" download="${doc.name}" style="position:absolute; inset:0;"></a></div>`).join('');
    gallery.innerHTML = html || '<div style="grid-column: span 2; opacity:0.5; text-align:center;">No docs.</div>';
}

export function openCompletionModal(taskId, taskName) { document.body.classList.add('no-scroll'); document.getElementById('modal-task-name').innerText = taskName; document.getElementById('completion-modal').dataset.activeTaskId = taskId; document.getElementById('completion-modal').style.display = 'flex'; setTimeout(() => document.getElementById('completion-modal').classList.add('active'), 10); }
export function closeCompletionModal() { document.getElementById('completion-modal').classList.remove('active'); setTimeout(() => { document.getElementById('completion-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function triggerConfetti() { if(navigator.vibrate) navigator.vibrate([50, 50, 50]); const colors = ['#007aff', '#ff9500', '#ff3b30', '#af52de', '#34c759', '#ffd60a']; for(let i=0; i<60; i++) { const conf = document.createElement('div'); conf.className = 'particle confetti'; conf.style.background = colors[Math.floor(Math.random() * colors.length)]; conf.style.left = Math.random() * 100 + 'vw'; document.body.appendChild(conf); setTimeout(() => conf.remove(), 4000); } }

export function triggerEmojiRain(city) { if(navigator.vibrate) navigator.vibrate([30, 30]); const emojis = { 'la': ['🌴', '☀️', '🎬'], 'utah': ['⛰️', '🤠', '🏜️'], 'vegas': ['🎲', '🎰', '💸'] }; const set = emojis[city] || ['✨']; for(let i=0; i<30; i++) { const em = document.createElement('div'); em.className = 'particle emoji-drop'; em.innerText = set[Math.floor(Math.random() * set.length)]; em.style.left = Math.random() * 100 + 'vw'; document.body.appendChild(em); setTimeout(() => em.remove(), 4000); } }

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const wheel = document.getElementById('roulette-wheel'); if(!wheel) return;
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it"];
    wheel.dataset.names = JSON.stringify(names);
    let gradient = []; let html = ''; const sliceDeg = 360 / names.length;
    names.forEach((name, i) => {
        let color = i % 2 === 0 ? '#d0021b' : '#1c1c1e'; if (name === "Split it") color = '#34c759';
        gradient.push(`${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`);
        html += `<div class="roulette-label" style="transform: translateX(-50%) rotate(${i * sliceDeg + (sliceDeg / 2)}deg);"><span>${name}</span></div>`;
    });
    wheel.style.background = `conic-gradient(${gradient.join(', ')})`; wheel.innerHTML = html;
}

export function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel'); const btn = document.getElementById('btn-spin-roulette');
    if(!wheel || btn.disabled) return;
    btn.disabled = true; btn.style.opacity = '0.5';
    let names = JSON.parse(wheel.dataset.names || '[]');
    const totalRotation = (parseFloat(wheel.dataset.currentRotation || 0)) + 2160 + Math.floor(Math.random() * 360);
    wheel.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)'; wheel.style.transform = `rotate(${totalRotation}deg)`; wheel.dataset.currentRotation = totalRotation;
    setTimeout(() => {
        btn.disabled = false; btn.style.opacity = '1';
        const winner = names[Math.floor((360 - (totalRotation % 360)) / (360 / names.length))];
        document.getElementById('roulette-result-text').innerText = `${winner} Wins!`;
        triggerConfetti();
    }, 4500);
}

// --- MEETUP & ALERTS ENGINE ---

export async function renderMeetupBoard() {
    const board = document.getElementById('btn-open-meetup');
    const boardText = document.getElementById('meetup-text');
    const boardAuthor = document.getElementById('meetup-author');
    const statusLabel = document.getElementById('meetup-status-label');
    
    const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
    if (meetups.length === 0) {
        boardText.innerText = "No active announcements.";
        boardAuthor.innerText = "Tap to broadcast to the group!";
        return;
    }

    const latest = meetups[meetups.length - 1];
    const messageId = btoa(latest[1] + latest[2]).substring(0, 12);
    const lastSeenId = await getVal('lastSeenMeetupId');
    const currentUser = localStorage.getItem('appUser') || 'Unknown';
    const isUrgent = latest[1].includes('[ALERT]');
    const cleanText = latest[1].replace('[ALERT]', '').trim();

    boardText.innerText = `"${cleanText}"`;
    boardAuthor.innerText = `— ${escapeHTML(latest[2])}`;

    // CHECK IF NEW
    if (messageId !== lastSeenId) {
        board.classList.add('new-alert-pulse');
        statusLabel.innerText = "NEW ANNOUNCEMENT";
        
        // PHYSICAL BUZZ & NOTIF (Only if not the author)
        if (latest[2] !== currentUser) {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            if (Notification.permission === 'granted') {
                new Notification(isUrgent ? '🚨 URGENT MEETUP' : '📢 Meetup Update', { body: cleanText, icon: 'img/icon-192.png' });
            }
            // IF URGENT, SHOW FULL SCREEN MODAL
            if (isUrgent) showUrgentAlertModal(cleanText, latest[2]);
        }
    } else {
        board.classList.remove('new-alert-pulse');
        statusLabel.innerText = "LIVE BULLETIN";
    }
}

function showUrgentAlertModal(text, author) {
    const overlay = document.getElementById('urgent-alert-overlay');
    document.getElementById('urgent-alert-msg').innerText = `${text}\n\n— ${author}`;
    overlay.style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate([500, 100, 500, 100, 500]);
}

export function openMeetupModal() {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('meetup-modal');
    document.getElementById('new-meetup-author').value = localStorage.getItem('appUser') || '';
    document.getElementById('new-meetup-text').value = '';
    document.getElementById('urgent-toggle').checked = false;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export async function submitMeetup() {
    const author = document.getElementById('new-meetup-author').value.trim();
    let text = document.getElementById('new-meetup-text').value.trim();
    const urgent = document.getElementById('urgent-toggle').checked;

    if (!text || !author) { alert("Please enter your name and message!"); return; }
    if (urgent) text = `[ALERT] ${text}`;

    await saveQuoteToSheet('MEETUP', text, author);
    
    // Mark as seen immediately for the poster
    const messageId = btoa(text + author).substring(0, 12);
    await setVal('lastSeenMeetupId', messageId);
    
    renderMeetupBoard();
    closeMeetupModal();
    triggerConfetti();
}

export function closeMeetupModal() { 
    document.getElementById('meetup-modal').classList.remove('active'); 
    setTimeout(() => { document.getElementById('meetup-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

export function renderAnchor() {
    const container = document.getElementById('anchor-container');
    if (!container) return;
    const saved = localStorage.getItem('carAnchor');
    if (saved) {
        const data = JSON.parse(saved);
        container.innerHTML = `<div class="admin-card pulse-btn" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #34c759, #28a745); border:none; box-shadow: 0 8px 24px rgba(52, 199, 89, 0.4); display: flex; align-items: center; justify-content: space-between; border-radius: 50px;"><div id="btn-find-car" data-lat="${data.lat}" data-lon="${data.lon}" style="cursor: pointer; display: flex; align-items: center; gap: 10px; flex: 1;"><span style="font-size: 20px;">🧭</span><span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Dude where's my car?</span></div><button id="btn-clear-anchor" style="background: #ff3b30; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3); z-index: 10; margin-left: 10px;">Found it</button></div>`;
    } else {
        container.innerHTML = `<div class="admin-card" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border:none; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3); text-align: center; border-radius: 50px;"><div id="btn-drop-anchor" style="cursor: pointer; display: flex; align-items: center; gap: 10px;"><span style="font-size: 20px;">⚓🚗</span><span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Drop Car Anchor</span></div></div>`;
    }
}

export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal');
    modal.dataset.location = location;
    document.getElementById('quote-modal-title').innerText = `💬 ${location.toUpperCase()} Quotes`;
    renderQuotes(location);
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const filtered = (state.quotesData || []).filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    document.getElementById('quote-list').innerHTML = filtered.map(q => `<div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);"><div style="font-style: italic; font-size: 16px; margin-bottom: 8px;">"${escapeHTML(q[1])}"</div><div style="text-align: right; font-size: 11px; font-weight: 800; opacity: 0.6;">— ${escapeHTML(q[2])}</div></div>`).reverse().join('') || '<div class="empty-state">No quotes yet.</div>';
}

export async function submitNewQuote() {
    const author = document.getElementById('new-quote-author').value.trim();
    const text = document.getElementById('new-quote-text').value.trim();
    const loc = document.getElementById('quote-modal').dataset.location;
    if (!text || !author) { alert("Fill all fields!"); return; }
    await saveQuoteToSheet(loc, text, author);
    document.getElementById('new-quote-text').value = ''; renderQuotes(loc); triggerConfetti();
}

export function closeQuoteModal() { document.getElementById('quote-modal').classList.remove('active'); setTimeout(() => { document.getElementById('quote-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export function openManageQuotesModal() { document.body.classList.add('no-scroll'); document.getElementById('manage-quotes-modal').style.display = 'flex'; renderAdminQuotes(); setTimeout(() => document.getElementById('manage-quotes-modal').classList.add('active'), 10); }
export function renderAdminQuotes() { document.getElementById('admin-quotes-list').innerHTML = (state.quotesData || []).map(q => `<div style="background: var(--bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ios-grey);"><div style="flex: 1;"><div style="font-size: 14px; font-weight: 700;">"${escapeHTML(q[1])}"</div><div style="font-size: 11px; opacity: 0.6;">— ${escapeHTML(q[2])} (${escapeHTML(q[0])})</div></div><button class="delete-quote-btn" data-loc="${escapeHTML(q[0])}" data-quote="${escapeHTML(q[1])}" data-author="${escapeHTML(q[2])}" style="background: #ff3b30; color: white; border: none; border-radius: 8px; padding: 10px;">🗑️</button></div>`).reverse().join('') || 'No quotes.'; }
export function closeManageQuotesModal() { document.getElementById('manage-quotes-modal').classList.remove('active'); setTimeout(() => { document.getElementById('manage-quotes-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) { document.body.classList.add('no-scroll'); const modal = document.getElementById('stay-modal'); document.getElementById('stay-modal-hero').style.backgroundImage = imgUrl ? `url('${imgUrl}')` : `none`; document.getElementById('stay-modal-title').innerText = `🏡 ${fam} Stay`; document.getElementById('stay-modal-addr').innerText = `📍 ${addr}`; document.getElementById('stay-modal-buttons').innerHTML = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1;">🚗 Drive</button>${listLink?`<button class="action-btn link-btn" data-url="${listLink}" style="flex: 1; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>`:''}`; modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); }
export function closeStayModal() { document.getElementById('stay-modal').classList.remove('active'); setTimeout(() => { document.getElementById('stay-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export function openGateModal(flightId) { document.body.classList.add('no-scroll'); const modal = document.getElementById('gate-modal'); modal.dataset.flightid = flightId; modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); }
export function closeGateModal() { document.getElementById('gate-modal').classList.remove('active'); setTimeout(() => { document.getElementById('gate-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function openTipsModal(city) {
    document.body.classList.add('no-scroll');
    const titles = { 'la': 'Los Angeles', 'utah': 'Utah', 'vegas': 'Las Vegas' };
    document.getElementById('tips-modal-title').innerHTML = `💡 ${titles[city] || city} Tips`;
    const modal = document.getElementById('tips-modal');
    modal.dataset.city = city;
    renderTips('eating');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTipsModal() { document.getElementById('tips-modal').classList.remove('active'); setTimeout(() => { document.getElementById('tips-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderTips(category) {
    const city = document.getElementById('tips-modal').dataset.city;
    const filtered = (state.vaultAndStaysData || []).filter(row => row[1]?.toLowerCase() === 'tip' && row[2]?.toLowerCase().includes(city) && row[3]?.toLowerCase() === category);
    document.getElementById('tips-content').innerHTML = filtered.map(row => `<div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 700;">${escapeHTML(row[4])}</div><div style="font-size: 11px; opacity:0.6; margin-top:5px;">👤 ${escapeHTML(row[0])}</div></div>`).join('') || 'No tips yet.';
}
