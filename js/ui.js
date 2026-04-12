import { state, setVal, getVal, escapeHTML, parseDateTime } from './store.js';

// ---- ITINERARY & VAULT ----
export async function renderItinerary() {
    const filter = document.getElementById('family-selector')?.value || 'All';
    const completedTasks = await getVal('completedTasks') || [];
    
    let hLA = '', hUtah = '', hVegas = '', hToday = '', hTomorrow = '';
    let cLA = '', cUtah = '', cVegas = '', cToday = '', cTomorrow = '';
    let lLA = '', lUtah = '', lVegas = ''; 
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); 
    
    state.itineraryData.forEach(cols => {
        if(cols.length < 5) return;
        const d = cols[0].trim(); const loc = cols[1].trim(); const act = cols[2].trim();
        const time = cols[3].trim(); const who = cols[4].trim(); const addr = (cols.length >= 6) ? cols[5].trim() : '';
        
        if (filter === 'All' || who.toLowerCase() === filter.toLowerCase() || who.toLowerCase() === 'everyone') {
            const searchLoc = addr !== '' ? addr : `${act} ${loc}`;
            const mapLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(searchLoc);
            const addrHtml = addr ? `<br><span style="font-size: 13px; font-weight: 600; opacity: 0.8; display: inline-block; margin-top: 6px;">🗺️ ${escapeHTML(addr)}</span>` : '';
            
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, '');
            const isCompleted = completedTasks.includes(taskId);

            let cardClass = isCompleted ? 'admin-card itin-card completed' : 'admin-card itin-card';
            let badgeHtml = isCompleted ? `<span style="background: #34c759; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; color: white; box-shadow: 0 2px 10px rgba(52, 199, 89, 0.4);">✅ DONE</span>` : `<span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; color: var(--text);">${escapeHTML(who)}</span>`;

            const cardHtml = `
                <div class="${cardClass}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="text-align: left; transition: all 0.3s ease; cursor: pointer; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                        <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>${badgeHtml}
                    </div>
                    <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3; margin-bottom: 8px;">${escapeHTML(act)}</div>
                    <div style="font-size: 14px; font-weight: 700; opacity: 0.7; line-height: 1.5;">
                        📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;">Get Directions</a>${addrHtml}
                    </div>
                </div>`;

            const pushToView = (cVar, hVar, lastDateVar) => {
                if (isCompleted) return { h: hVar, c: cVar + cardHtml, l: lastDateVar };
                if (d !== lastDateVar) { hVar += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lastDateVar = d; }
                return { h: hVar + cardHtml, c: cVar, l: lastDateVar };
            };

            if (loc.toLowerCase().includes('la')) { const res = pushToView(cLA, hLA, lLA); hLA = res.h; cLA = res.c; lLA = res.l; }
            else if (loc.toLowerCase().includes('utah')) { const res = pushToView(cUtah, hUtah, lUtah); hUtah = res.h; cUtah = res.c; lUtah = res.l; }
            else if (loc.toLowerCase().includes('vegas')) { const res = pushToView(cVegas, hVegas, lVegas); hVegas = res.h; cVegas = res.c; lVegas = res.l; }
            
            const isDateMatch = (s, target) => { let dt = new Date(parseDateTime(s)); return dt.toDateString() === target.toDateString(); };
            if (isDateMatch(d, today)) { isCompleted ? cToday += cardHtml : hToday += cardHtml; } 
            else if (isDateMatch(d, tomorrow)) { isCompleted ? cTomorrow += cardHtml : hTomorrow += cardHtml; }
        }
    });
    
    const updateSec = (id, h, c) => {
        const m = document.getElementById(`${id}-itinerary`); const l = document.getElementById(`${id}-completed-list`); const w = document.getElementById(`${id}-completed-section`);
        if(m) m.innerHTML = h || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">No active plans</div></div>';
        if(l && w) { if(c) { l.innerHTML = c; w.style.display = 'block'; } else w.style.display = 'none'; }
    };
    updateSec('la', hLA, cLA); updateSec('utah', hUtah, cUtah); updateSec('vegas', hVegas, cVegas); updateSec('today', hToday, cToday); updateSec('tomorrow', hTomorrow, cTomorrow);
}

export function renderTravelVault() { 
    const filter = document.getElementById('family-selector')?.value || 'All';
    const display = document.getElementById('flights-vault-display');
    const emptyState = document.getElementById('empty-vault-state');
    if(!display) return;

    let html = '';
    let hasData = false;

    const sortedData = [...state.vaultAndStaysData].sort((a,b) => parseDateTime(a[2]) - parseDateTime(b[2]));

    sortedData.forEach(cols => {
        if(cols.length < 2) return;
        const fam = cols[0].trim();
        const type = cols[1].trim().toLowerCase();
        
        if (filter === 'All' || fam.toLowerCase() === filter.toLowerCase() || fam.toLowerCase() === 'everyone') {
            if (type === 'flight') {
                hasData = true;
                const date = escapeHTML(cols[2]?.trim());
                const dep = escapeHTML(cols[3]?.trim());
                const arr = escapeHTML(cols[4]?.trim());
                const airline = escapeHTML(cols[5]?.trim().toUpperCase());
                const fnum = escapeHTML(cols[6]?.trim());
                const ftime = escapeHTML(cols[7]?.trim());
                const term = escapeHTML(cols[8]?.trim());
                const ref = escapeHTML(cols[9]?.trim());

                const searchStr = (airline + fnum).replace(/\s+/g, '');
                const trackerLink = searchStr ? "https://flightaware.com/live/flight/" + searchStr : "#";
                const linkHtml = searchStr ? `<a href="${escapeHTML(trackerLink)}" target="_blank" class="flight-tracker-link">${airline} ${fnum} ↗</a>` : `${airline} ${fnum}`;

                html += `
                <div class="flight-card">
                    <div class="flight-header">
                        <span class="flight-num">${linkHtml}</span>
                        <span style="font-size:12px; font-weight:800; opacity:0.8; text-align: right;">${date} <br> TIME: ${ftime}</span>
                    </div>
                    <div class="flight-path">
                        <div class="path-node"><span>From</span><strong>${dep}</strong></div>
                        <div class="plane-icon"></div>
                        <div class="path-node"><span>To</span><strong>${arr}</strong></div>
                    </div>
                    <div style="margin-top:15px; display:flex; justify-content: space-between; align-items:center; font-size:13px; font-weight:700; opacity:0.9;">
                        <span>Term/Gate: ${term || "Check Screens"}</span>
                        <span>Ref: ${ref}</span>
                    </div>
                    <div class="barcode"></div>
                </div>`;
            } else if (type === 'car') {
                hasData = true;
                html += `
                <div class="admin-card" style="margin-bottom:24px; border-left: 5px solid var(--accent);">
                    <div style="font-size:11px; font-weight:900; opacity:0.5; text-transform:uppercase; letter-spacing: 0.5px;">🚗 Car Rental</div>
                    <div style="font-size:16px; font-weight:700; margin-top:10px;">
                        <div style="margin-bottom: 12px;"><strong>Company:</strong> ${escapeHTML(cols[4]?.trim())}</div>
                        <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Pick-up:</strong><br>${escapeHTML(cols[5]?.trim())}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${escapeHTML(cols[2]?.trim())} @ ${escapeHTML(cols[6]?.trim())}</span></div>
                        <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Drop-off:</strong><br>${escapeHTML(cols[8]?.trim()) || escapeHTML(cols[5]?.trim())}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${escapeHTML(cols[3]?.trim())} @ ${escapeHTML(cols[7]?.trim())}</span></div>
                        <span style="color: var(--accent); font-size:14px;"><strong>Ref:</strong> ${escapeHTML(cols[9]?.trim())}</span>
                    </div>
                </div>`;
            }
        }
    });

    display.innerHTML = html;
    if(emptyState) emptyState.style.display = hasData ? 'none' : 'flex';
}

export function renderAccommodations() { 
    const filter = document.getElementById('family-selector')?.value || 'All';
    const today = new Date(); today.setHours(0,0,0,0);
    
    let htmlLA = '', htmlUtah = '', htmlVegas = '', htmlToday = '';

    state.vaultAndStaysData.forEach(cols => {
        if(cols.length < 2) return;
        const fam = cols[0].trim();
        const type = cols[1].trim().toLowerCase();

        if (type === 'stay' && (filter === 'All' || fam.toLowerCase() === filter.toLowerCase() || fam.toLowerCase() === 'everyone')) {
            const checkIn = cols[2]?.trim();
            const city = cols[3]?.trim();
            const address = escapeHTML(cols[4]?.trim());
            const checkOut = cols[5]?.trim();
            const link = escapeHTML(cols[6]?.trim());
            const imgUrl = escapeHTML(cols[7]?.trim());

            const headerBg = imgUrl ? `url('${imgUrl}') center/cover` : `var(--accent)`;
            const mapLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
            
            const ui = `
                <div class="admin-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
                    <div style="height: 140px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                        <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="font-size: 14px; opacity: 0.6; font-weight: 700; margin-bottom: 15px;">📍 ${address}</div>
                        <div style="display: flex; gap: 10px;">
                            <button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1; padding: 12px; font-size: 14px;">🚗 Drive</button>
                            ${link ? `<button class="action-btn link-btn" data-url="${link}" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>` : ''}
                        </div>
                    </div>
                </div>`;
                
            if(city.toLowerCase().includes('la')) htmlLA += ui;
            else if(city.toLowerCase().includes('utah')) htmlUtah += ui;
            else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;

            if (checkIn && checkOut) {
                let sDate = new Date(parseDateTime(checkIn));
                let eDate = new Date(parseDateTime(checkOut));
                sDate.setHours(0,0,0,0);
                eDate.setHours(23,59,59,999);
                if (today >= sDate && today <= eDate) htmlToday += ui;
            }
        }
    });

    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA;
    const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
    const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
    const todayCard = document.getElementById('today-home-card'); if(todayCard) todayCard.innerHTML = htmlToday;
}

// ---- SHARE API ----
export async function shareDay(dayViewId, titleName) {
    const container = document.getElementById(dayViewId);
    if(!container) return;
    const cards = container.querySelectorAll('.itin-card:not(.completed)');
    let text = `🇺🇸 USA 2026 - ${titleName} Itinerary\n\n`;
    if(cards.length === 0) text += "Nothing scheduled yet!";
    cards.forEach(card => {
        const time = card.querySelector('strong').innerText;
        const act = card.querySelector('.itin-title').innerText;
        text += `• ${time}: ${act}\n`;
    });
    if (navigator.share) {
        try { await navigator.share({ title: titleName, text }); } catch (e) {}
    } else {
        navigator.clipboard.writeText(text); alert('Copied to clipboard!');
    }
}

// ---- SCRATCHPAD & MODALS ----
export async function openScratchpad() {
    const modal = document.getElementById('scratchpad-modal');
    document.getElementById('scratchpad-text').value = await getVal('scratchpadNotes') || '';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}
export function closeScratchpad() {
    const modal = document.getElementById('scratchpad-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}
export function saveScratchpad() {
    const val = document.getElementById('scratchpad-text').value;
    setVal('scratchpadNotes', val);
}

export function openCompletionModal(taskId, taskName) {
    document.getElementById('modal-task-name').innerText = taskName;
    document.getElementById('modal-checkbox').checked = false;
    document.getElementById('btn-confirm-modal').style.opacity = '0.5';
    document.getElementById('btn-confirm-modal').style.pointerEvents = 'none';
    const modal = document.getElementById('completion-modal');
    modal.dataset.activeTaskId = taskId;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10); 
}
export function closeCompletionModal() {
    const modal = document.getElementById('completion-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}
