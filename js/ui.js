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

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    new Set(state.sheetFamilies || []).forEach(f => { const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt); });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { localStorage.setItem('appUser', document.getElementById('family-selector').value); renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); renderUpNext(); }
export function clearCustomFamilies() { if(confirm("Remove all old saved names?")) { localStorage.removeItem('appUser'); window.location.reload(); } }

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
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
            
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
    const display = document.getElementById('flights-vault-display'); const emptyState = document.getElementById('empty-vault-state');
    if(!display) return; let html = ''; let hasData = false; 
    
    const sortedData = [...state.vaultAndStaysData].sort((a,b) => (parseDateTime(a[2]||'', null) || Number.MAX_SAFE_INTEGER) - (parseDateTime(b[2]||'', null) || Number.MAX_SAFE_INTEGER));
    const filter = localStorage.getItem('appUser') || 'All'; const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    
    sortedData.forEach(cols => {
        if(!cols || cols.length < 2) return; 
        const fam = (cols[0] || '').trim(); const type = (cols[1] || '').trim().toLowerCase(); 
        
        let isMatch = false; const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true; 
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true; 
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;
        
        if (isMatch) {
            if (type === 'flight') {
                hasData = true; const date = escapeHTML(cols[2]?.trim() || ''); const dep = escapeHTML(cols[3]?.trim() || ''); const arr = escapeHTML(cols[4]?.trim() || ''); const airline = escapeHTML(cols[5]?.trim().toUpperCase() || ''); const fnum = escapeHTML(cols[6]?.trim() || ''); const ftime = escapeHTML(cols[7]?.trim() || ''); 
                const flightId = btoa(encodeURIComponent(`${date}-${airline}-${fnum}`)).replace(/=/g, ''); const baseTerm = escapeHTML(cols[8]?.trim() || ''); const activeTerm = (state.gateOverrides && state.gateOverrides[flightId]) ? state.gateOverrides[flightId] : baseTerm;
                const flLink = `https://flightaware.com/live/flight/${(airline+fnum).replace(/\s+/g,'')}`;

                html += `<div class="flip-container travel-card"><div class="flip-card-inner"><div class="flip-front" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">✈️ Flight • ${date}</div><div style="font-size: 11px; font-weight: 900; opacity: 0.7;">${escapeHTML(fam)}</div></div><div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong style="font-size: 22px; font-weight: 900;">${dep} → ${arr}</strong><div style="text-align: right;"><div style="color: #bae6fd; font-weight: 800;">${airline} ${fnum}</div><div style="font-size: 12px; opacity: 0.8; font-weight: 700;">${ftime}</div></div></div><div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-align: center; margin-top: 15px;">Tap for Boarding Pass ⤵</div></div><div class="flip-back"><div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;"><span>Terminal / Gate</span><span>Ref: ${escapeHTML(cols[9]?.trim() || 'N/A')}</span></div><div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;"><div id="gate-text-${flightId}" style="font-size: 18px; font-weight: 900; color: #ffd60a; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${activeTerm || 'Check Board'}</div><button class="edit-gate-btn action-btn" data-flightid="${flightId}" style="padding: 6px 12px; font-size: 11px; width: auto; margin: 0; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); box-shadow: none;">✏️ Edit</button></div><div style="font-size: 12px; font-weight: 700; margin-bottom: 15px;"><a href="${flLink}" target="_blank" style="color: white; text-decoration: underline;">Track Flight ↗</a></div><div class="barcode" style="background: repeating-linear-gradient(90deg, white, white 2px, transparent 2px, transparent 4px, white 4px, white 6px, transparent 6px, transparent 10px); height: 30px; opacity: 0.8; border-radius: 4px;"></div></div></div></div>`;
            } else if (type === 'car') {
                hasData = true; const pdate = escapeHTML(cols[2]?.trim()||''); const company = escapeHTML(cols[4]?.trim()||''); const ploc = escapeHTML(cols[5]?.trim()||'');
                html += `<div class="flip-container travel-card"><div class="flip-card-inner"><div class="flip-front" style="background: linear-gradient(135deg, #34c759, #28a745); color: white; border: none;"><div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">🚗 Car Rental • ${pdate}</div><div style="font-size: 11px; font-weight: 900; opacity: 0.7;">${escapeHTML(fam)}</div></div><div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong style="font-size: 22px; font-weight: 900;">${company}</strong><div style="text-align: right;"><div style="color: #bbf7d0; font-weight: 800;">Pick-up</div><div style="font-size: 12px; opacity: 0.8; font-weight: 700;">${ploc}</div></div></div><div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-align: center; margin-top: 15px;">Tap for Details ⤵</div></div><div class="flip-back car-back" style="background: linear-gradient(135deg, #34c759, #28a745);"><div style="font-size: 12px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; justify-content: space-between;"><span>Booking Details</span><span>Ref: ${escapeHTML(cols[9]?.trim() || 'N/A')}</span></div><div style="margin-bottom: 10px;"><div style="font-size: 11px; opacity: 0.8; font-weight: 700;">PICK-UP</div><div style="font-size: 14px; font-weight: 900;">${ploc}</div><div style="font-size: 12px; opacity: 0.9;">${pdate} @ ${escapeHTML(cols[6]?.trim() || '')}</div></div><div><div style="font-size: 11px; opacity: 0.8; font-weight: 700;">DROP-OFF</div><div style="font-size: 14px; font-weight: 900;">${escapeHTML(cols[8]?.trim())||ploc}</div><div style="font-size: 12px; opacity: 0.9;">${escapeHTML(cols[3]?.trim() || '')} @ ${escapeHTML(cols[7]?.trim() || '')}</div></div></div></div></div>`;
            }
        }
    }); display.innerHTML = html; if(emptyState) emptyState.style.display = hasData ? 'none' : 'flex';
}

export function renderAccommodations() { 
    if (!state.vaultAndStaysData) return;
    let htmlLA = '', htmlUtah = '', htmlVegas = '';
    const filter = localStorage.getItem('appUser') || 'All'; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 2) return; const fam = (cols[0] || '').trim(); const type = (cols[1] || '').trim().toLowerCase(); 
        let isMatch = false; const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true; 
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true; 
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;
        
        if (type === 'stay' && isMatch) {
            const addr = cols[4]?.trim() || ''; const img = cols[7]?.trim() || '';
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            const ui = `<div class="admin-card stay-card" data-fam="${escapeHTML(fam)}" data-addr="${escapeHTML(addr)}" data-map="${mapLink}" data-link="${escapeHTML(cols[6]?.trim()||'')}" data-img="${escapeHTML(img)}" style="padding: 0; overflow: hidden; margin-bottom: 24px; cursor: pointer;"><div style="height: 100px; background: ${img?`url('${img}') center/cover`:`var(--accent)`}; display: flex; align-items: flex-end; padding: 20px;"><h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3></div></div>`;
            const city = cols[3] || '';
            if(city.toLowerCase().includes('la')) htmlLA += ui; else if(city.toLowerCase().includes('utah')) htmlUtah += ui; else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;
        }
    });
    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA; 
    const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
    const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
}

export async function handleFileUpload(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = async (e) => {
        let docs = await getVal('offline_docs') || []; docs.push({ id: Date.now().toString(), name: file.name, type: file.type, data: e.target.result });
        await setVal('offline_docs', docs); renderWallet();
    }; reader.readAsDataURL(file);
}

export async function renderWallet() {
    const docs = await getVal('offline_docs') || []; 
    const gallery = document.getElementById('wallet-gallery'); if(!gallery) return;
    if(docs.length === 0) { gallery.innerHTML = '<div style="grid-column: span 2; opacity:0.5; text-align:center;">No docs yet.</div>'; return; }
    
    gallery.innerHTML = docs.map(doc => {
        const isImg = doc.type.startsWith('image/');
        const linkTag = isImg 
            ? `<a class="wallet-doc-link" data-src="${doc.data}" style="position:absolute; inset:0; z-index:1; cursor:pointer;"></a>`
            : `<a href="${doc.data}" download="${doc.name}" style="position:absolute; inset:0; z-index:1; cursor:pointer;"></a>`;
            
        return `<div class="wallet-item" style="background: ${isImg ? `url(${doc.data})` : 'var(--ios-grey)'}; background-size: cover; background-position: center;">${isImg ? '' : '📄'}<button class="delete-doc-btn" data-id="${doc.id}">×</button>${linkTag}</div>`;
    }).join('');
}

export function openLightbox(src) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    img.style.transform = 'scale(0.95)'; img.src = src;
    modal.style.display = 'flex'; setTimeout(() => { modal.classList.add('active'); img.style.transform = 'scale(1)'; }, 10);
}

export function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); document.getElementById('lightbox-img').src = ''; }, 300);
}

export function openCompletionModal(taskId, taskName) {
    document.body.classList.add('no-scroll');
    document.getElementById('modal-task-name').innerText = taskName; document.getElementById('modal-checkbox').checked = false;
    document.getElementById('btn-confirm-modal').style.opacity = '0.5'; document.getElementById('btn-confirm-modal').style.pointerEvents = 'none';
    const modal = document.getElementById('completion-modal'); modal.dataset.activeTaskId = taskId;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); 
}
export function closeCompletionModal() {
    const modal = document.getElementById('completion-modal'); modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function triggerConfetti() {
    if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
    const colors = ['#007aff', '#ff9500', '#ff3b30', '#af52de', '#34c759', '#ffd60a'];
    for(let i=0; i<60; i++) {
        const conf = document.createElement('div'); conf.className = 'particle confetti';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + 'vw'; conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's'; document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}

export function triggerEmojiRain(city) {
    if(navigator.vibrate) navigator.vibrate([30, 30]);
    const emojis = { 'la': ['🌴', '☀️', '🎬', '⭐', '🏄'], 'utah': ['⛰️', '🤠', '🏜️', '🥾', '🔥'], 'vegas': ['🎲', '🎰', '💸', '🃏', '🍸'] };
    const set = emojis[city] || ['✨'];
    for(let i=0; i<30; i++) {
        const em = document.createElement('div'); em.className = 'particle emoji-drop';
        em.innerText = set[Math.floor(Math.random() * set.length)]; em.style.left = Math.random() * 100 + 'vw';
        em.style.animationDuration = (Math.random() * 2 + 2) + 's'; document.body.appendChild(em);
        setTimeout(() => em.remove(), 4000);
    }
}

export function openTipsModal(city) {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const titles = { 'la': 'Los Angeles', 'utah': 'Utah', 'vegas': 'Las Vegas' };
    document.getElementById('tips-modal-title').innerHTML = `💡 ${titles[city.toLowerCase()]} Tips`;
    document.querySelectorAll('.tips-tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.cat === 'eating'); });
    const modal = document.getElementById('tips-modal'); modal.dataset.city = city.toLowerCase();
    renderTips('eating'); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTipsModal() { document.getElementById('tips-modal').classList.remove('active'); setTimeout(() => { document.getElementById('tips-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderTips(category) {
    if (!state.vaultAndStaysData) return;
    const currentTipsCity = document.getElementById('tips-modal').dataset.city;
    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 5) return; 
        const fam = (cols[0] || '').trim(); const type = (cols[1] || '').trim().toLowerCase(); 
        const city = (cols[2] || '').trim().toLowerCase(); const cat = (cols[3] || '').trim().toLowerCase(); const details = (cols[4] || '').trim();
        
        let isMatch = false; const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true; 
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true; 
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;

        if (type === 'tip' && city.includes(currentTipsCity) && cat === category && isMatch) {
            const badge = fam.toLowerCase() !== 'everyone' ? `<span style="background: var(--accent-gradient); padding: 4px 10px; border-radius: 12px; color: white; font-size: 11px; font-weight: 800; display: inline-block; margin-top: 8px;">👤 ${escapeHTML(fam)}</span>` : '';
            html += `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 500; line-height: 1.6; white-space: pre-wrap; color: var(--text);">${escapeHTML(details)}</div><div style="font-size: 11px; font-weight: 800; opacity:0.6; margin-top: 10px;">👤 ${escapeHTML(fam)}</div></div>`;
        }
    }); 
    document.getElementById('tips-content').innerHTML = html || `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">👻</span><div class="empty-text" style="font-size: 16px;">No tips saved!</div></div>`;
}

export function openVegasFoodModal() {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('vegas-food-modal');
    document.querySelectorAll('.vegas-food-tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.cat === 'Nice'); });
    renderVegasFoodList('Nice');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeVegasFoodModal() { 
    const modal = document.getElementById('vegas-food-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

export function renderVegasFoodList(category) {
    const content = document.getElementById('vegas-food-content');
    if (!state.vaultAndStaysData) {
        content.innerHTML = `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">🍽️</span><div class="empty-text" style="font-size: 16px;">No data loaded yet!</div></div>`;
        return;
    }
    
    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 6) return; 
        const type = (cols[1] || '').trim().toLowerCase(); 
        const cat = (cols[2] || '').trim().toLowerCase(); 
        
        if (type === 'vegasfood' && cat === category.toLowerCase()) {
            const name = escapeHTML(cols[3] || '');
            const vibe = escapeHTML(cols[4] || '');
            const reasoning = escapeHTML(cols[5] || '');
            
            html += `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);">
                <div style="font-size: 18px; font-weight: 900; margin-bottom: 6px; color: var(--text);">${name}</div>
                ${vibe ? `<div style="font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #ff9500, #ff3b30); color: white; display: inline-block; padding: 4px 10px; border-radius: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">✨ ${vibe}</div>` : ''}
                <div style="font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--text); opacity: 0.9;">${reasoning}</div>
            </div>`;
        }
    }); 
    content.innerHTML = html || `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">🍽️</span><div class="empty-text" style="font-size: 16px; margin-bottom: 10px;">Add data to Google Sheets!</div><div style="font-size:11px; opacity:0.7;">Make sure Type is "<b>vegasfood</b>" and Category is "<b>${escapeHTML(category)}</b>"</div></div>`;
}


export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal'); modal.dataset.location = location;
    document.getElementById('quote-modal-title').innerText = `💬 ${location === 'la' ? 'Los Angeles' : location === 'vegas' ? 'Las Vegas' : location.toUpperCase()} Quotes`;
    document.getElementById('new-quote-author').value = ''; document.getElementById('new-quote-text').value = '';
    renderQuotes(location); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const list = document.getElementById('quote-list');
    const filtered = (state.quotesData || []).filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    if (filtered.length === 0) { list.innerHTML = `<div class="empty-state" style="padding: 20px;"><div class="empty-text">No quotes yet.</div></div>`; return; }
    list.innerHTML = filtered.map(q => `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);"><div style="font-family: 'Georgia', serif; font-style: italic; font-size: 16px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; color: var(--text);">"${escapeHTML(q[1])}"</div><div style="text-align: right; font-size: 11px; font-weight: 800; opacity: 0.6; text-transform: uppercase;">— ${escapeHTML(q[2])}</div></div>`).reverse().join('');
}

export async function submitNewQuote() {
    const author = document.getElementById('new-quote-author').value.trim(); const text = document.getElementById('new-quote-text').value.trim();
    const loc = document.getElementById('quote-modal').dataset.location;
    if (!text || !author) { alert("Please enter both who said it and what they said!"); return; }
    if (navigator.vibrate) navigator.vibrate(20);
    await saveQuoteToSheet(loc, text, author);
    document.getElementById('new-quote-author').value = ''; document.getElementById('new-quote-text').value = '';
    renderQuotes(loc); triggerConfetti();
}

export function closeQuoteModal() { document.getElementById('quote-modal').classList.remove('active'); setTimeout(() => { document.getElementById('quote-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function openManageQuotesModal() { 
    document.body.classList.add('no-scroll'); 
    renderAdminQuotes(); 
    document.getElementById('manage-quotes-modal').style.display = 'flex'; 
    setTimeout(() => document.getElementById('manage-quotes-modal').classList.add('active'), 10); 
}

export function closeManageQuotesModal() { document.getElementById('manage-quotes-modal').classList.remove('active'); setTimeout(() => { document.getElementById('manage-quotes-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderAdminQuotes() {
    const list = document.getElementById('admin-quotes-list');
    const validQuotes = (state.quotesData || []).filter(q => { const loc = (q[0] || '').toUpperCase(); return loc !== 'MEETUP' && loc !== 'ROULETTE' && loc !== 'ROULETTE_RESET'; });
    if (validQuotes.length === 0) { list.innerHTML = `<div class="empty-state" style="padding: 20px;">No quotes to manage.</div>`; return; }
    list.innerHTML = validQuotes.map((q, index) => `<div style="background: var(--bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ios-grey);"><div style="flex: 1; padding-right: 10px;"><div style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--text);">"${escapeHTML(q[1])}"</div><div style="font-size: 11px; opacity: 0.6; color: var(--text);">— ${escapeHTML(q[2])} (${escapeHTML(q[0]).toUpperCase()})</div></div><button class="delete-quote-btn" data-loc="${escapeHTML(q[0])}" data-quote="${escapeHTML(q[1])}" data-author="${escapeHTML(q[2])}" style="background: #ff3b30; color: white; border: none; border-radius: 8px; padding: 10px 12px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3);">🗑️</button></div>`).reverse().join('');
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('stay-modal');
    document.getElementById('stay-modal-hero').style.backgroundImage = imgUrl && imgUrl !== "undefined" && imgUrl !== "" ? `url('${imgUrl}')` : `none`;
    if(!imgUrl || imgUrl === "undefined" || imgUrl === "") document.getElementById('stay-modal-hero').style.backgroundColor = `var(--accent)`;
    document.getElementById('stay-modal-title').innerText = `🏡 ${fam} Stay`; 
    
    document.getElementById('stay-modal-addr').innerHTML = `<div id="copy-addr-btn" data-addr="${escapeHTML(addr)}" style="cursor:pointer; display:inline-flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(0,0,0,0.05); border:1px solid var(--ios-grey); border-radius:8px; font-size:14px; font-weight:700; transition:all 0.2s;">📍 ${escapeHTML(addr)} <span style="opacity:0.5;">📋</span></div>`;
    
    let btnHtml = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1; padding: 16px; font-size: 16px;">🚗 Drive</button>`;
    if (listLink && listLink !== "undefined" && listLink !== "") { btnHtml += `<button class="action-btn link-btn" data-url="${listLink}" style="flex: 1; padding: 16px; font-size: 16px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>`; }
    document.getElementById('stay-modal-buttons').innerHTML = btnHtml;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeStayModal() { document.getElementById('stay-modal').classList.remove('active'); setTimeout(() => { document.getElementById('stay-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function openGateModal(flightId) { document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(20); const modal = document.getElementById('gate-modal'); modal.dataset.flightid = flightId; document.getElementById('gate-input-term').value = ''; document.getElementById('gate-input-gate').value = ''; modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); setTimeout(() => document.getElementById('gate-input-term').focus(), 300); }

export function closeGateModal() { document.getElementById('gate-modal').classList.remove('active'); setTimeout(() => { document.getElementById('gate-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderAnchor() {
    const container = document.getElementById('anchor-container'); if (!container) return;
    const saved = localStorage.getItem('carAnchor');
    if (saved) {
        const data = JSON.parse(saved);
        container.innerHTML = `<div class="admin-card pulse-btn" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #34c759, #28a745); border:none; box-shadow: 0 8px 24px rgba(52, 199, 89, 0.4); display: flex; align-items: center; justify-content: space-between; border-radius: 50px;"><div id="btn-find-car" data-lat="${data.lat}" data-lon="${data.lon}" style="cursor: pointer; display: flex; align-items: center; gap: 10px; flex: 1;"><span style="font-size: 20px;">🧭</span><span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Dude where's my car?</span></div><button id="btn-clear-anchor" style="background: #ff3b30; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3); z-index: 10; margin-left: 10px;">Found it</button></div>`;
    } else {
        container.innerHTML = `<div class="admin-card" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border:none; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3); text-align: center; border-radius: 50px;"><div id="btn-drop-anchor" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;"><span style="font-size: 20px;">⚓🚗</span><span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Drop Car Anchor</span></div></div>`;
    }
}

export function checkMorningBriefing() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 12) {
        const today = new Date().toDateString();
        if (localStorage.getItem('lastBriefingDate') !== today) {
            openMorningBriefing();
            localStorage.setItem('lastBriefingDate', today);
        }
    }
}

export function openMorningBriefing() {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
    
    const modal = document.getElementById('briefing-modal');
    const now = new Date();
    
    const user = localStorage.getItem('appUser'); 
    const nameStr = (user && user !== 'All') ? user.split(' ')[0] : "Team";
    document.getElementById('briefing-title').innerText = `Good Morning, ${nameStr}!`;
    document.getElementById('briefing-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    const itinContainer = document.getElementById('briefing-itin');
    const todayStr = now.toDateString();
    let todayTasks = [];
    
    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; 
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    if (state.itineraryData) {
        state.itineraryData.forEach(cols => {
            if(!cols || cols.length < 5) return;
            const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); 
            const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); 
            const who = (cols[4] || '').trim();
            
            let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
            if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true;
            else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true;
            else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true;
            else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

            if (isMatch) {
                const taskTime = parseDateTime(d, time || '23:59');
                if (taskTime && new Date(taskTime).toDateString() === todayStr) {
                    todayTasks.push({ act, time: time || 'TBD', loc, timestamp: taskTime });
                }
            }
        });
    }
    
    if (todayTasks.length > 0) {
        todayTasks.sort((a, b) => a.timestamp - b.timestamp);
        itinContainer.innerHTML = todayTasks.map(t => 
            `<div style="display:flex; align-items:center; background:rgba(255,255,255,0.6); padding:10px 15px; border-radius:12px; margin-bottom:8px; border:1px solid rgba(0,0,0,0.05);">
                <strong style="width: 55px; font-size: 14px; color: var(--accent);">${escapeHTML(t.time)}</strong>
                <div style="flex: 1; font-weight: 700; font-size: 15px; color: #1c1c1e;">${escapeHTML(t.act)}</div>
            </div>`
        ).join('');
    } else {
        itinContainer.innerHTML = `<div style="padding: 15px; background:rgba(255,255,255,0.6); border-radius:12px; text-align:center; font-weight:700; color: #1c1c1e; opacity: 0.7;">No fixed plans today. Enjoy the pool! 🏖️</div>`;
    }

    const quoteContainer = document.getElementById('briefing-quote');
    const validQuotes = (state.quotesData || []).filter(q => q[0] !== 'MEETUP' && q[0] !== 'ROULETTE' && q[0] !== 'ROULETTE_RESET' && q[1]);
    
    if (validQuotes.length > 0) {
        const randQ = validQuotes[Math.floor(Math.random() * validQuotes.length)];
        quoteContainer.innerHTML = `
            <div style="padding: 15px; background: rgba(255,255,255,0.6); border-radius: 12px; font-style: italic; color: #1c1c1e; border-left: 4px solid var(--accent);">
                "${escapeHTML(randQ[1])}"
                <div style="text-align: right; font-weight: 800; font-size: 11px; margin-top: 8px; text-transform: uppercase; font-style: normal; opacity: 0.7;">— ${escapeHTML(randQ[2])}</div>
            </div>
        `;
    } else {
        quoteContainer.innerHTML = `<div style="font-size: 13px; color: #1c1c1e; opacity: 0.6; text-align: center;">No quotes yet. Say something funny today!</div>`;
    }

    modal.style.display = 'flex'; 
    setTimeout(() => modal.classList.add('active'), 10);
    triggerConfetti(); 
}

export function closeMorningBriefing() {
    const modal = document.getElementById('briefing-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}
