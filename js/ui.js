import { state, setVal, getVal, escapeHTML, parseDateTime } from './store.js';
import { syncToCloud, saveQuoteToSheet, deleteQuoteFromSheet } from './api.js';

export function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark); document.body.classList.toggle('light-mode', !isDark);
    const btnLight = document.getElementById('btnLight'); const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    updateMetaThemeColor(document.querySelector('.tab-content.active')?.id || 'home', isDark);
}

export function setThemeMode(isDark) { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); }

export function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ffcc00';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    else if (pageId === 'splash') metaColor = isDark ? '#000000' : '#f2f2f7';
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = metaColor;
}

function updateFlap(id, newVal) {
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
    const cdDisplay = document.getElementById('countdown-display'); const iconStart = document.getElementById('prog-icon-start'); const iconEnd = document.getElementById('prog-icon-end');
    
    if (savedStart) {
        const tripStart = new Date(savedStart); tripStart.setHours(0,0,0,0);
        let tripEnd = savedEnd ? new Date(savedEnd) : new Date(tripStart.getTime() + (14 * 24 * 60 * 60 * 1000)); tripEnd.setHours(23,59,59,999);
        const inputStart = document.getElementById('trip-start-date'); if(inputStart) inputStart.value = savedStart;
        const inputEnd = document.getElementById('trip-end-date'); if(inputEnd) inputEnd.value = savedEnd || '';

        if (now < tripStart) {
            if(iconStart) iconStart.innerText = '🏠'; if(iconEnd) iconEnd.innerText = '✈️';
            const days = Math.ceil((tripStart - now) / (1000 * 60 * 60 * 24));
            if(progLabel) progLabel.innerText = "Countdown";
            updateFlap('cd-num', days.toString()); if(cdDisplay) cdDisplay.style.display = 'flex';
            if(progBar) { 
                if (days > 100) { progBar.style.width = '0%'; if(progVal) progVal.innerText = "Waiting for 100 Day mark..."; } 
                else { const percent = 100 - days; progBar.style.width = `${percent}%`; progBar.style.background = '#34c759'; if(progVal) progVal.innerText = `100-Day Milestone: ${percent}% Complete`; }
            }
        } else if (now >= tripStart && now <= tripEnd) {
            if(iconStart) iconStart.innerText = '☀️'; if(iconEnd) iconEnd.innerText = '🏠';
            const totalDuration = tripEnd - tripStart; const elapsed = now - tripStart;
            let percent = (elapsed / totalDuration) * 100; if(percent > 100) percent = 100;
            const dayNum = Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1; const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
            if(progLabel) progLabel.innerText = "Trip Progress"; if(progVal) progVal.innerText = `Day ${dayNum} of ${totalDays}`;
            if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) { progBar.style.width = `${percent}%`; progBar.style.background = '#ffd60a'; }
        } else {
            if(iconStart) iconStart.innerText = '✈️'; if(iconEnd) iconEnd.innerText = '🏠';
            if(progLabel) progLabel.innerText = "Trip Complete"; if(progVal) progVal.innerText = `Hope you had fun!`;
            if(cdDisplay) cdDisplay.style.display = 'none'; if(progBar) { progBar.style.width = `100%`; progBar.style.background = '#34c759'; }
        }
    } else {
        if(iconStart) iconStart.innerText = '🏠'; if(iconEnd) iconEnd.innerText = '✈️';
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

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    new Set(state.sheetFamilies || []).forEach(f => { const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt); });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { localStorage.setItem('appUser', document.getElementById('family-selector').value); renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); renderUpNext(); }
export function clearCustomFamilies() { if(confirm("Clear memory?")) { localStorage.removeItem('appUser'); window.location.reload(); } }

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    const now = new Date(); const nowTime = now.getTime(); const todayStr = now.toDateString(); 
    const sortedData = [...state.itineraryData].sort((a, b) => (parseDateTime(a[0] || '', a[3] || '23:59') || Number.MAX_SAFE_INTEGER) - (parseDateTime(b[0] || '', b[3] || '23:59') || Number.MAX_SAFE_INTEGER));

    sortedData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim(); const addr = (cols.length >= 6) ? (cols[5] || '').trim() : '';
        
        let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true; 
        else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true; 
        else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

        if (isMatch) {
            const mapQuery = addr || `${act} ${loc}`;
            const mapLink = `https://www.google.com/maps/...?q=${encodeURIComponent(mapQuery)}`;
            
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            
            let isHappening = false; const taskDateObj = parseDateTime(d, time);
            if (taskDateObj && !isCompleted && nowTime >= taskDateObj && nowTime < taskDateObj + (90 * 60000)) isHappening = true;
            
            let cardClass = isCompleted ? 'admin-card itin-card completed' : 'admin-card itin-card';
            if (isHappening) cardClass += ' happening-now pulse-btn';
            
            let badgeHtml = isCompleted ? `<span style="background: #34c759; padding: 4px 12px; border-radius: 20px; color: white; font-size: 11px; font-weight: 900;">✅ DONE</span>` : `<span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">${escapeHTML(who)}</span>`;
            let extraLabel = isHappening ? `<div style="color: var(--accent); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">🚀 Happening Now</div>` : '';

            const cardHtml = `
                <div class="timeline-card-wrapper ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="${cardClass}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding: 20px; margin-bottom: 16px; cursor: pointer;">
                        ${extraLabel}
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>${badgeHtml}
                        </div>
                        <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3;">${escapeHTML(act)}</div>
                        ${addr || act ? `<div style="font-size: 13px; font-weight: 700; opacity: 0.7; margin-top: 10px;"><a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none;">📍 Get Directions</a></div>` : ''}
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
            let isOpen = (!isNaN(new Date(date)) && new Date(date).toDateString() === todayStr) ? 'open' : '';
            html += `<details class="day-group" ${isOpen}><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}</span></summary><div class="day-content timeline">${cards.join('')}</div></details>`;
        } return html;
    };
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); document.getElementById('la-completed-list').innerHTML = cLA ? `<div class="timeline">${cLA}</div>` : '';
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); document.getElementById('utah-completed-list').innerHTML = cUtah ? `<div class="timeline">${cUtah}</div>` : '';
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); document.getElementById('vegas-completed-list').innerHTML = cVegas ? `<div class="timeline">${cVegas}</div>` : '';
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
            const ui = `<div class="admin-card stay-card" data-fam="${escapeHTML(fam)}" data-addr="${escapeHTML(addr)}" data-map="https://www.google.com/maps/...?q=${encodeURIComponent(addr)}" data-link="${escapeHTML(cols[6]||'')}" data-img="${escapeHTML(img)}" style="padding: 0; overflow: hidden; margin-bottom: 24px; cursor: pointer;"><div style="height: 100px; background: ${img?`url('${img}') center/cover`:`var(--accent)`}; display: flex; align-items: flex-end; padding: 20px;"><h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3></div></div>`;
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
    
    // NEW: TWEAKED FONT WEIGHT AND WHITE-SPACE PRE-WRAP SO LINE BREAKS SHOW UP!
    document.getElementById('tips-content').innerHTML = filtered.map(row => `
        <div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);">
            <div style="font-size: 15px; font-weight: 500; line-height: 1.6; white-space: pre-wrap; color: var(--text);">${escapeHTML(row[4])}</div>
            <div style="font-size: 11px; font-weight: 800; opacity:0.6; margin-top: 10px;">👤 ${escapeHTML(row[0])}</div>
        </div>
    `).join('') || '<div class="empty-state">No tips yet.</div>';
}

export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal'); modal.dataset.location = location;
    document.getElementById('quote-modal-title').innerText = `💬 ${location === 'la' ? 'Los Angeles' : location === 'vegas' ? 'Las Vegas' : location.toUpperCase()} Quotes`;
    document.getElementById('new-quote-author').value = ''; document.getElementById('new-quote-text').value = '';
    renderQuotes(location); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const filtered = (state.quotesData || []).filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    
    // NEW: ADDED WHITE SPACE PRE-WRAP TO QUOTES AS WELL!
    document.getElementById('quote-list').innerHTML = filtered.map(q => `
        <div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);">
            <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 16px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; color: var(--text);">"${escapeHTML(q[1])}"</div>
            <div style="text-align: right; font-size: 11px; font-weight: 800; opacity: 0.6; text-transform: uppercase;">— ${escapeHTML(q[2])}</div>
        </div>
    `).reverse().join('') || '<div class="empty-state">No quotes yet.</div>';
}

export async function submitNewQuote() {
    const author = document.getElementById('new-quote-author').value.trim(); const text = document.getElementById('new-quote-text').value.trim();
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
