
import { state, setVal, getVal, escapeHTML, parseDateTime } from '../store.js';
import { syncToCloud } from '../api.js';
import { triggerConfetti } from '../core/animations.js';

export function renderTravelVault() { 
    if (!state.vaultAndStaysData) return;
    const display = document.getElementById('flights-vault-display'); const emptyState = document.getElementById('empty-vault-state');
    if(!display) return; let html = ''; let hasData = false; 
    
    const sortedData = [...state.vaultAndStaysData].sort((a,b) => (parseDateTime(a[2]||'', null) || Number.MAX_SAFE_INTEGER) - (parseDateTime(b[2]||'', null) || Number.MAX_SAFE_INTEGER));
    const filter = localStorage.getItem('appUser') || 'All'; const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    const nowMs = new Date().getTime();
    
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

                const flightTimeObj = parseDateTime(cols[2]?.trim(), cols[7]?.trim());
                let checkInHtml = ''; let glowStyle = '';
                
                if (flightTimeObj) {
                    const timeDiff = flightTimeObj - nowMs;
                    if (timeDiff > 0 && timeDiff <= 86400000) {
                        const checkInUrl = `https://www.google.com/search?q=${encodeURIComponent(airline + ' web check in')}`;
                        glowStyle = 'box-shadow: 0 0 20px rgba(52, 199, 89, 0.8); border: 2px solid #34c759;';
                        checkInHtml = `<button class="action-btn pulse-btn" onclick="window.open('${checkInUrl}', '_blank'); event.stopPropagation();" style="background: #34c759; margin-top: 15px; font-size: 14px; padding: 12px; font-weight: 900;">🚨 CHECK-IN OPEN</button>`;
                    }
                }

                html += `<div class="flip-container travel-card"><div class="flip-card-inner"><div class="flip-front" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; ${glowStyle}"><div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">✈️ Flight • ${date}</div><div style="font-size: 11px; font-weight: 900; opacity: 0.7;">${escapeHTML(fam)}</div></div><div style="display: flex; justify-content: space-between; align-items: flex-end;"><strong style="font-size: 22px; font-weight: 900;">${dep} → ${arr}</strong><div style="text-align: right;"><div style="color: #bae6fd; font-weight: 800;">${airline} ${fnum}</div><div style="font-size: 12px; opacity: 0.8; font-weight: 700;">${ftime}</div></div></div>${checkInHtml}<div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-align: center; margin-top: 15px;">Tap for Boarding Pass ⤵</div></div><div class="flip-back"><div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;"><span>Terminal / Gate</span><span>Ref: ${escapeHTML(cols[9]?.trim() || 'N/A')}</span></div><div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;"><div id="gate-text-${flightId}" style="font-size: 18px; font-weight: 900; color: #ffd60a; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${activeTerm || 'Check Board'}</div><button class="edit-gate-btn action-btn" data-flightid="${flightId}" style="padding: 6px 12px; font-size: 11px; width: auto; margin: 0; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); box-shadow: none;">✏️ Edit</button></div><div style="font-size: 12px; font-weight: 700; margin-bottom: 15px;"><a href="${flLink}" target="_blank" style="color: white; text-decoration: underline;">Track Flight ↗</a></div><div class="barcode" style="background: repeating-linear-gradient(90deg, white, white 2px, transparent 2px, transparent 4px, white 4px, white 6px, transparent 6px, transparent 10px); height: 30px; opacity: 0.8; border-radius: 4px;"></div></div></div></div>`;
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
            const ui = `
            <div class="stay-card polaroid-effect" data-fam="${escapeHTML(fam)}" data-addr="${escapeHTML(addr)}" data-map="${mapLink}" data-link="${escapeHTML(cols[6]?.trim()||'')}" data-img="${escapeHTML(img)}" style="cursor: pointer;">
                <div style="height: 160px; background: ${img?`url('${img}') center/cover`:`var(--ios-grey)`}; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);"></div>
                <h3 style="margin: 15px 0 0 0; color: #1c1c1e; font-family: 'Caveat', 'Marker Felt', 'Comic Sans MS', cursive; font-size: 32px; text-align: center; font-weight: 700; letter-spacing: 1px;">🏡 ${escapeHTML(fam)}</h3>
                <div style="text-align: center; font-size: 11px; font-weight: 800; color: #8e8e93; margin-top: 5px; text-transform: uppercase;">Tap for details ↗</div>
            </div>`;
            const city = cols[3] || '';
            if(city.toLowerCase().includes('la')) htmlLA += ui; else if(city.toLowerCase().includes('utah')) htmlUtah += ui; else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;
        }
    });
    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA; 
    const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
    const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('stay-modal');
    document.getElementById('stay-modal-hero').style.backgroundImage = imgUrl && imgUrl !== "undefined" && imgUrl !== "" ? `url('${imgUrl}')` : `none`;
    if(!imgUrl || imgUrl === "undefined" || imgUrl === "") document.getElementById('stay-modal-hero').style.backgroundColor = `var(--accent)`;
    document.getElementById('stay-modal-title').innerText = `🏡 ${fam} Stay`; 
    
    document.getElementById('stay-modal-addr').innerHTML = `<div id="copy-addr-btn" data-addr="${escapeHTML(addr)}" style="cursor:pointer; display:inline-flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(0,0,0,0.05); border:1px solid var(--ios-grey); border-radius:8px; font-size:14px; font-weight:700; transition:all 0.2s;">📍 ${escapeHTML(addr)} <span style="opacity:0.5;">📋</span></div>`;
    
    let btnHtml = `<button class="action-btn nav-trigger-btn" data-query="${escapeHTML(addr)}" data-loc="${escapeHTML(addr.toLowerCase())}" style="flex: 1; padding: 16px; font-size: 16px;">🚗 Drive</button>`;
    if (listLink && listLink !== "undefined" && listLink !== "") { btnHtml += `<button class="action-btn link-btn" data-url="${listLink}" style="flex: 1; padding: 16px; font-size: 16px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>`; }
    document.getElementById('stay-modal-buttons').innerHTML = btnHtml;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeStayModal() { 
    document.getElementById('stay-modal').classList.remove('active'); 
    setTimeout(() => { document.getElementById('stay-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

export function openGateModal(flightId) { 
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(20); 
    const modal = document.getElementById('gate-modal'); modal.dataset.flightid = flightId; 
    document.getElementById('gate-input-term').value = ''; document.getElementById('gate-input-gate').value = ''; 
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); 
    setTimeout(() => document.getElementById('gate-input-term').focus(), 300); 
}

export function closeGateModal() { 
    document.getElementById('gate-modal').classList.remove('active'); 
    setTimeout(() => { document.getElementById('gate-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

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
