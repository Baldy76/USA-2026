import { state, setVal, getVal, escapeHTML, parseDateTime } from './store.js';
import { fetchWeather, syncToCloud, saveQuoteToSheet } from './api.js';

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
    
    if (savedStart) {
        const tripStart = new Date(savedStart); tripStart.setHours(0,0,0,0);
        let tripEnd = savedEnd ? new Date(savedEnd) : new Date(tripStart.getTime() + (14 * 24 * 60 * 60 * 1000));
        if (now < tripStart) {
            const days = Math.ceil((tripStart - now) / (1000 * 60 * 60 * 24));
            updateFlap('cd-num', days.toString());
            if(cdDisplay) cdDisplay.style.display = 'flex';
            if(progBar) progBar.style.width = '100%';
        } else {
            if(cdDisplay) cdDisplay.style.display = 'none';
            const total = tripEnd - tripStart; const elapsed = now - tripStart;
            let percent = Math.min(100, (elapsed / total) * 100);
            if(progBar) progBar.style.width = `${percent}%`;
            const valEl = document.getElementById('trip-prog-val');
            if(valEl) valEl.innerText = `Day ${Math.floor(elapsed/(864e5))+1}`;
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
    renderUpNext();
}

export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal');
    modal.dataset.location = location;
    document.getElementById('quote-modal-title').innerText = `💬 ${location.toUpperCase()} Quotes`;
    document.getElementById('new-quote-text').value = ''; 
    renderQuotes(location);
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const list = document.getElementById('quote-list');
    const quotes = state.quotesData || [];
    const filtered = quotes.filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">No quotes yet. Hear something funny?</div>`;
        return;
    }
    
    list.innerHTML = filtered.map(q => `
        <div style="background: #1c1c1e; color: white; padding: 20px; border-radius: 16px; margin-bottom: 15px; border-left: 4px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 18px; line-height: 1.4; margin-bottom: 10px;">"${escapeHTML(q[1])}"</div>
            <div style="text-align: right; font-size: 12px; font-weight: 800; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">— ${escapeHTML(q[2])}</div>
        </div>
    `).reverse().join('');
}

export async function submitNewQuote() {
    const text = document.getElementById('new-quote-text').value.trim();
    const modal = document.getElementById('quote-modal');
    const author = localStorage.getItem('appUser') || 'Anonymous';
    
    if (!text) return;
    if (navigator.vibrate) navigator.vibrate(20);
    await saveQuoteToSheet(modal.dataset.location, text, author);
    document.getElementById('new-quote-text').value = '';
    renderQuotes(modal.dataset.location);
    triggerConfetti();
}

export function closeQuoteModal() {
    const modal = document.getElementById('quote-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function renderAnchor() {
    const container = document.getElementById('anchor-container'); if (!container) return;
    const saved = localStorage.getItem('carAnchor');
    if (saved) {
        const data = JSON.parse(saved); const time = new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        container.innerHTML = `
        <div class="admin-card pulse-btn" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #34c759, #28a745); border:none; box-shadow: 0 8px 24px rgba(52, 199, 89, 0.4); text-align: center; position: relative; border-radius: 50px;">
            <button id="btn-clear-anchor" style="position:absolute; top: 50%; right: 15px; transform: translateY(-50%); background: rgba(0,0,0,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; font-size: 10px; font-weight: bold; cursor: pointer;">✕</button>
            <div id="btn-find-car" data-lat="${data.lat}" data-lon="${data.lon}" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 20px;">🧭</span><span style="font-size: 14px; font-weight: 900; color: white;">Dude where's my car?</span><span style="font-size: 10px; color: white; opacity:0.7;">(${time})</span>
            </div>
        </div>`;
    } else {
        container.innerHTML = `<div class="admin-card" id="btn-drop-anchor" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border:none; text-align: center; border-radius: 50px; cursor:pointer;"><div style="display: flex; align-items: center; justify-content: center; gap: 10px; color:white;"><span style="font-size: 20px;">⚓🚗</span><span style="font-size: 14px; font-weight: 900;">Drop Car Anchor</span></div></div>`;
    }
}

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    const sortedData = [...state.itineraryData].sort((a, b) => {
        const dtA = parseDateTime(a[0], a[3] || '23:59') || Number.MAX_SAFE_INTEGER; 
        const dtB = parseDateTime(b[0], b[3] || '23:59') || Number.MAX_SAFE_INTEGER;
        return dtA - dtB;
    });

    sortedData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const [d, loc, act, time, who] = [cols[0].trim(), cols[1].trim(), cols[2].trim(), cols[3].trim(), cols[4].trim()];
        const addr = cols[5] ? cols[5].trim() : '';
        let isMatch = (filter === 'All' || who.toLowerCase().includes(filter.toLowerCase()));
        if (!isMatch && leech.includes(filter.toLowerCase()) && who.toLowerCase().includes('leech')) isMatch = true;
        if (!isMatch && murray.includes(filter.toLowerCase()) && who.toLowerCase().includes('murray')) isMatch = true;

        if (isMatch) {
            const mapQuery = addr || `${act} ${loc}`;
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            const cardHtml = `
                <div class="timeline-card-wrapper ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="admin-card itin-card ${isCompleted ? 'completed' : ''}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding: 20px; margin-bottom: 16px; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>
                            <span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">${escapeHTML(who)}</span>
                        </div>
                        <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3;">${escapeHTML(act)}</div>
                        ${addr ? `<div style="font-size: 13px; font-weight: 700; opacity: 0.7; margin-top: 10px;"><a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none;">📍 Get Directions</a></div>` : ''}
                    </div>
                </div>`;
            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : (!grouped['la'][d] && (grouped['la'][d]=[]), grouped['la'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : (!grouped['utah'][d] && (grouped['utah'][d]=[]), grouped['utah'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : (!grouped['vegas'][d] && (grouped['vegas'][d]=[]), grouped['vegas'][d].push(cardHtml)); }
        }
    });

    const buildSec = (obj) => Object.entries(obj).map(([date, cards]) => `<details class="day-group" open><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}</span></summary><div class="day-content timeline">${cards.join('')}</div></details>`).join('');
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); document.getElementById('la-completed-list').innerHTML = cLA;
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); document.getElementById('utah-completed-list').innerHTML = cUtah;
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); document.getElementById('vegas-completed-list').innerHTML = cVegas;
}

export function renderTravelVault() { 
    if (!state.vaultAndStaysData) return;
    const display = document.getElementById('flights-vault-display'); if(!display) return;
    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 2) return;
        if(cols[1].toLowerCase() === 'flight' || cols[1].toLowerCase() === 'car') {
            const flightId = btoa(encodeURIComponent(`${cols[2]}-${cols[5]}-${cols[6]}`)).replace(/=/g, '');
            const term = (state.gateOverrides && state.gateOverrides[flightId]) ? state.gateOverrides[flightId] : cols[8];
            html += `
            <div class="flip-container travel-card">
                <div class="flip-card-inner">
                    <div class="flip-front" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding:20px; border-radius:24px;">
                        <div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">✈️ ${cols[1].toUpperCase()} • ${cols[2]}</div>
                        <strong style="font-size: 22px; display:block; margin: 10px 0;">${cols[3]} → ${cols[4]}</strong>
                        <div style="font-size: 12px; opacity: 0.8;">${cols[5]} ${cols[6]} @ ${cols[7]}</div>
                    </div>
                    <div class="flip-back" style="background: var(--accent-gradient); color: white; padding:20px; border-radius:24px; transform: rotateY(180deg);">
                        <div style="font-size: 12px; font-weight: 800;">TERMINAL / GATE</div>
                        <div id="gate-text-${flightId}" style="font-size: 20px; font-weight: 900; margin: 10px 0;">${term || 'Check Board'}</div>
                        <button class="edit-gate-btn action-btn" data-flightid="${flightId}" style="background:rgba(255,255,255,0.2); font-size:12px;">✏️ Edit Gate</button>
                    </div>
                </div>
            </div>`;
        }
    });
    display.innerHTML = html;
}

export function renderAccommodations() { 
    if (!state.vaultAndStaysData) return;
    let grouped = { 'la': '', 'utah': '', 'vegas': '' };
    state.vaultAndStaysData.forEach(cols => {
        if (!cols || cols.length < 4) return;
        if (cols[1].toLowerCase() === 'stay') {
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cols[4])}`;
            const html = `<div class="admin-card stay-card" data-fam="${escapeHTML(cols[0])}" data-addr="${escapeHTML(cols[4])}" data-map="${mapLink}" data-link="${escapeHTML(cols[6]||'')}" data-img="${escapeHTML(cols[7]||'')}" style="padding: 0; overflow: hidden; margin-bottom: 24px; cursor: pointer;"><div style="height: 100px; background: ${cols[7]?`url('${cols[7]}') center/cover`:`var(--accent)`}; display: flex; align-items: flex-end; padding: 20px;"><h3 style="margin: 0; color: white; font-size: 20px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${cols[0]} Stay</h3></div></div>`;
            const city = cols[3].toLowerCase();
            if(city.includes('la')) grouped['la'] += html; else if(city.includes('utah')) grouped['utah'] += html; else if(city.includes('vegas')) grouped['vegas'] += html;
        }
    });
    document.getElementById('la-home-card').innerHTML = grouped['la'];
    document.getElementById('utah-home-card').innerHTML = grouped['utah'];
    document.getElementById('vegas-home-card').innerHTML = grouped['vegas'];
}

export function renderScoreboard() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const board = document.getElementById('roulette-scoreboard'); if (!board) return;
    let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
    let current = tallies[mode] || {};
    let html = Object.entries(current).map(([n, c]) => c > 0 ? `<div style="background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px;">${n} <span style="background: var(--card); color: var(--accent); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px;">${c}</span></div>` : '').join('');
    board.innerHTML = html || `<div style="font-size: 11px; opacity: 0.6;">No spins yet.</div>`;
}

export async function handleFileUpload(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = async (e) => {
        let docs = await getVal('offline_docs') || []; docs.push({ id: Date.now().toString(), name: file.name, type: file.type, data: e.target.result });
        await setVal('offline_docs', docs); renderWallet();
    }; reader.readAsDataURL(file);
}

export async function renderWallet() {
    const docs = await getVal('offline_docs') || []; const gallery = document.getElementById('wallet-gallery'); if(!gallery) return;
    gallery.innerHTML = docs.length === 0 ? '<div style="grid-column: span 2; opacity:0.5; text-align:center;">No docs yet.</div>' : docs.map(doc => `<div class="wallet-item" style="background: ${doc.type.startsWith('image/') ? `url(${doc.data})` : 'var(--ios-grey)'};">${doc.type.startsWith('image/') ? '' : '📄'}<button class="delete-doc-btn" data-id="${doc.id}">×</button><a href="${doc.data}" download="${doc.name}" style="position:absolute; inset:0; z-index:1;"></a></div>`).join('');
}

export function openCompletionModal(taskId, taskName) {
    document.body.classList.add('no-scroll');
    document.getElementById('modal-task-name').innerText = taskName; document.getElementById('modal-checkbox').checked = false;
    const modal = document.getElementById('completion-modal'); modal.dataset.activeTaskId = taskId;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); 
}

export function triggerConfetti() {
    if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
    const colors = ['#007aff', '#ff9500', '#ff3b30', '#af52de', '#34c759', '#ffd60a'];
    for(let i=0; i<60; i++) {
        const conf = document.createElement('div'); conf.className = 'particle confetti';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + 'vw'; conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(conf); setTimeout(() => conf.remove(), 4000);
    }
}

export function triggerEmojiRain(city) {
    const emojis = { 'la': ['🌴', '☀️', '🎬'], 'utah': ['⛰️', '🤠', '🏜️'], 'vegas': ['🎲', '🎰', '💸'] };
    const set = emojis[city] || ['✨'];
    for(let i=0; i<30; i++) {
        const em = document.createElement('div'); em.className = 'particle emoji-drop';
        em.innerText = set[Math.floor(Math.random() * set.length)];
        em.style.left = Math.random() * 100 + 'vw'; em.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(em); setTimeout(() => em.remove(), 4000);
    }
}

export function triggerHype() {
    const toast = document.getElementById('hype-toast'); if(!toast) return;
    const hypeQuotes = [ "Prepare the Vegas bankroll! 💸", "In-N-Out Burger is calling! 🍔", "USA 2026: Epic Mode Activated 🚀" ];
    toast.innerText = hypeQuotes[Math.floor(Math.random() * hypeQuotes.length)];
    toast.style.display = 'block'; toast.classList.remove('toast-exit'); toast.classList.add('toast-enter');
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => toast.style.display = 'none', 300); }, 3000);
}

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const wheel = document.getElementById('roulette-wheel'); if(!wheel) return;
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it"];
    wheel.dataset.names = JSON.stringify(names);
    let html = ''; const sliceDeg = 360 / names.length;
    names.forEach((name, i) => {
        const color = name === "Split it" ? '#34c759' : (i % 2 === 0 ? '#d0021b' : '#1c1c1e');
        const startDeg = i * sliceDeg; const endDeg = (i + 1) * sliceDeg;
        html += `<div class="roulette-label" style="transform: translateX(-50%) rotate(${startDeg + (sliceDeg/2)}deg);"><span>${name}</span></div>`;
    });
    wheel.style.background = `conic-gradient(${names.map((n, i) => `${n === "Split it" ? '#34c759' : (i % 2 === 0 ? '#d0021b' : '#1c1c1e')} ${i * (360/names.length)}deg ${(i+1) * (360/names.length)}deg`).join(', ')})`;
    wheel.innerHTML = html; renderScoreboard();
}

export function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel'); const btn = document.getElementById('btn-spin-roulette');
    if(!wheel || !btn || btn.disabled) return;
    btn.disabled = true;
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    let names = JSON.parse(wheel.dataset.names || '[]');
    let currentRot = parseFloat(wheel.dataset.currentRotation || 0);
    const totalRotation = currentRot + (360 * 6) + Math.floor(Math.random() * 360);
    wheel.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`; wheel.dataset.currentRotation = totalRotation;
    const winner = names[Math.floor(((360 - (totalRotation % 360)) % 360) / (360 / names.length))];
    setTimeout(() => {
        btn.disabled = false; document.getElementById('roulette-result-text').innerText = `${winner} Wins!`;
        let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
        if(!tallies[mode]) tallies[mode] = {};
        tallies[mode][winner] = (tallies[mode][winner] || 0) + 1;
        localStorage.setItem('rouletteTallies', JSON.stringify(tallies));
        renderScoreboard(); triggerConfetti();
    }, 4500);
}

export function openTipsModal(city) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('tips-modal');
    modal.dataset.city = city;
    document.getElementById('tips-modal-title').innerText = `💡 ${city.toUpperCase()} Tips`;
    renderTips('eating');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderTips(category) {
    const city = document.getElementById('tips-modal').dataset.city;
    const filtered = (state.vaultAndStaysData || []).filter(cols => cols[1] && cols[1].toLowerCase() === 'tip' && cols[2].toLowerCase().includes(city.toLowerCase()) && cols[3].toLowerCase() === category.toLowerCase());
    document.getElementById('tips-content').innerHTML = filtered.length ? filtered.map(cols => `<div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 700;">${escapeHTML(cols[4])}</div><div style="font-size: 11px; opacity:0.5; margin-top:5px; font-weight: bold;">👤 ${escapeHTML(cols[0])}</div></div>`).join('') : '<div class="empty-state">No tips yet.</div>';
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('stay-modal');
    document.getElementById('stay-modal-hero').style.backgroundImage = imgUrl ? `url('${imgUrl}')` : `none`;
    document.getElementById('stay-modal-title').innerText = `🏡 ${fam} Stay`;
    document.getElementById('stay-modal-addr').innerText = `📍 ${addr}`;
    document.getElementById('stay-modal-buttons').innerHTML = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex:1;">🚗 Drive</button>${listLink ? `<button class="action-btn link-btn" data-url="${listLink}" style="flex:1; background:var(--ios-grey); color:var(--text);">🌐 Listing</button>` : ''}`;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function openGateModal(flightId) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('gate-modal'); modal.dataset.flightid = flightId;
    document.getElementById('gate-input-term').value = ''; document.getElementById('gate-input-gate').value = '';
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTipsModal() { document.getElementById('tips-modal').classList.remove('active'); setTimeout(() => { document.getElementById('tips-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export function closeStayModal() { document.getElementById('stay-modal').classList.remove('active'); setTimeout(() => { document.getElementById('stay-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export function closeGateModal() { document.getElementById('gate-modal').classList.remove('active'); setTimeout(() => { document.getElementById('gate-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export function closeQuoteModal() { document.getElementById('quote-modal').classList.remove('active'); setTimeout(() => { document.getElementById('quote-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
