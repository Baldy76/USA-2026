import { state, setVal, getVal, escapeHTML, parseDateTime } from './store.js';
import { fetchWeather, syncToCloud } from './api.js';

export function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
    const btnLight = document.getElementById('btnLight'); const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    const activePage = document.querySelector('.tab-content.active')?.id || 'home';
    updateMetaThemeColor(activePage, isDark);
}
export function setThemeMode(isDark) { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); }

export function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ff9500';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    else if (pageId === 'splash') metaColor = isDark ? '#000000' : '#f2f2f7';
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = metaColor;
}

// THE FIX: Bulletproof Time Engine
export function updateTimeAndCountdown() { 
    try {
        const now = new Date();
        const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
        
        try {
            const timePT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Los_Angeles' }).format(now);
            const timeMT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Denver' }).format(now);
            const elLA = document.getElementById('time-la'); if(elLA) elLA.innerText = `🕒 Local: ${timePT}`;
            const elVegas = document.getElementById('time-vegas'); if(elVegas) elVegas.innerText = `🕒 Local: ${timePT}`;
            const elUtah = document.getElementById('time-utah'); if(elUtah) elUtah.innerText = `🕒 Local: ${timeMT}`;
        } catch(e) { console.error(e); }

        const cContainer = document.getElementById('countdown-display'); 
        const clockContainer = document.getElementById('dual-clocks');
        if(!cContainer || !clockContainer) return;

        try {
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const dateString = now.toLocaleDateString(undefined, options);
            const cdDateEl = document.getElementById('cd-date'); if(cdDateEl) cdDateEl.textContent = dateString;
            const clockDateEl = document.getElementById('clock-date'); if(clockDateEl) clockDateEl.textContent = dateString;
        } catch(e) {}

        let showCountdown = false;
        try {
            const savedStart = localStorage.getItem('tripStartDate');
            if (savedStart) {
                const input = document.getElementById('trip-start-date'); if(input) input.value = savedStart;
                const tripDate = new Date(savedStart);
                if (!isNaN(tripDate.getTime())) {
                    tripDate.setHours(0,0,0,0); const diff = tripDate - now;
                    if (diff > 0) {
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        const cdText = document.getElementById('cd-text'); if(cdText) cdText.innerHTML = `🚀 ${days} Days!`;
                        showCountdown = true;
                    }
                }
            } 
        } catch(e) {}

        if (showCountdown) {
            cContainer.style.display = 'block'; clockContainer.style.display = 'none';
        } else {
            cContainer.style.display = 'none'; clockContainer.style.display = 'block';
            try {
                const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
                let localTz = 'America/Los_Angeles'; let localTzLabel = '🇺🇸 Local (PT)';
                if (activeTab === 'utah') { localTz = 'America/Denver'; localTzLabel = '🇺🇸 Local (MT)'; }
                const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
                const localTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: localTz }).format(now);
                const ukEl = document.getElementById('clock-uk'); if(ukEl) ukEl.innerText = ukTime;
                const locEl = document.getElementById('clock-local'); if(locEl) locEl.innerText = localTime;
                const tzEl = document.getElementById('local-tz-label'); if(tzEl) tzEl.innerText = localTzLabel;
            } catch(e) { console.error(e); }
        }
    } catch(e) { console.error(e); }
}

export function saveTripSettings() { localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); updateTimeAndCountdown(); }

export function convertCurrency() { 
    const usd = document.getElementById('usd-input')?.value;
    if(document.getElementById('gbp-output')) document.getElementById('gbp-output').innerText = usd ? `£${(usd / state.liveExchangeRate).toFixed(2)}` : `£0.00`;
}

export let currentTipPercent = 18;
export function setTip(percent, btnElement) { 
    currentTipPercent = percent; document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); calculateTip(); 
}
export function calculateTip() { 
    const b = parseFloat(document.getElementById('bill-total')?.value) || 0, s = parseInt(document.getElementById('split-ways')?.value) || 1;
    const t = b * (1 + (currentTipPercent / 100)), usd = t / s, gbp = usd / state.liveExchangeRate; 
    if(document.getElementById('tip-usd')) document.getElementById('tip-usd').innerText = `$${usd.toFixed(2)}`;
    if(document.getElementById('tip-gbp')) document.getElementById('tip-gbp').innerText = `£${gbp.toFixed(2)}`;
}

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    const sheetFams = state.sheetFamilies || [];
    new Set([...sheetFams]).forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt);
    });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { 
    const sel = document.getElementById('family-selector'); 
    if(sel && sel.value) localStorage.setItem('appUser', sel.value); 
    renderItinerary(); renderTravelVault(); renderAccommodations();
}

export function clearCustomFamilies() {
    if(confirm("Remove all old saved names from this device?")) {
        localStorage.removeItem('customFamilies'); localStorage.removeItem('appUser'); localStorage.removeItem('savedFamilyFilter');
        window.location.reload(); 
    }
}

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨' }; return m[c] || '🌤️'; };

// THE FIX: Graceful fail for GPS
export async function initWeatherPill() {
    const loadSummary = async (lat, lon, id) => {
        try {
            const data = await fetchWeather(lat, lon);
            const el = document.getElementById(id);
            if(el) el.innerHTML = `${getWeatherIcon(data.current.weather[0].icon)} ${Math.round(data.current.main.temp)}°`;
        } catch(e) { 
            const el = document.getElementById(id);
            if(el) el.innerHTML = '🚫'; 
        }
    };
    loadSummary(34.0522, -118.2437, 'wp-la'); loadSummary(37.0965, -113.5684, 'wp-utah'); loadSummary(36.1699, -115.1398, 'wp-vegas');
    
    const locEl = document.getElementById('wp-local');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => loadSummary(pos.coords.latitude, pos.coords.longitude, 'wp-local'),
            err => { if(locEl) locEl.innerHTML = '🚫'; },
            { timeout: 5000, maximumAge: 60000 }
        );
    } else {
        if(locEl) locEl.innerHTML = '🚫';
    }
}

export async function setWeatherCity(target) {
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-w-${target}`); if (activeBtn) activeBtn.classList.add('active');
    
    const wDash = document.getElementById('WTH-dashboard');
    if(wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><div class="empty-text">Syncing Radar...</div></div>`;
    
    try {
        let lat = 34.0522, lon = -118.2437, locName = "Los Angeles";
        if (target === 'utah') { lat = 37.0965; lon = -113.5684; locName = "Utah"; }
        else if (target === 'vegas') { lat = 36.1699; lon = -115.1398; locName = "Las Vegas"; }
        else if (target === 'local') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => { 
                        try {
                            const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
                            renderWeatherDOM(data, "Local GPS"); 
                        } catch(e) {
                            const fallbackData = await fetchWeather(lat, lon);
                            renderWeatherDOM(fallbackData, "Los Angeles");
                        }
                    }, 
                    async () => { 
                        const fallbackData = await fetchWeather(lat, lon);
                        renderWeatherDOM(fallbackData, "Los Angeles"); 
                    }, 
                    { timeout: 5000 }
                ); 
                return;
            }
            locName = "Local (Default LA)";
        }
        const data = await fetchWeather(lat, lon);
        renderWeatherDOM(data, locName);
    } catch(e) {
        if(wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">🚫</span><div class="empty-text">Weather Offline</div></div>`;
    }
}

export function openWeatherModal() {
    document.body.classList.add('no-scroll');
    document.getElementById('weather-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('weather-modal').classList.add('active'), 10);
    setWeatherCity('la');
}
export function closeWeatherModal() { 
    document.getElementById('weather-modal').classList.remove('active'); 
    setTimeout(() => { document.getElementById('weather-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

function renderWeatherDOM(data, fallbackName) {
    const d = data.current; const locName = fallbackName || d.name;
    let forecastHtml = data.forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
        return `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--ios-grey);"><span>${new Date(day.dt*1000).toLocaleDateString('en-GB',{weekday:'short'})}</span><span>${getWeatherIcon(day.weather[0].icon)}</span><span>${Math.round(day.main.temp)}°C</span></div>`;
    }).join('');
    document.getElementById('WTH-dashboard').innerHTML = `<div style="text-align:center; padding:20px; background:rgba(0,122,255,0.1); border-radius:15px; margin-bottom:20px;"><div style="font-size:50px;">${getWeatherIcon(d.weather[0].icon)}</div><div style="font-size:40px; font-weight:900;">${Math.round(d.main.temp)}°C</div><div style="text-transform:capitalize;">${d.weather[0].description}</div><div style="opacity: 0.5; margin-top: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(locName)}</div></div><h3 style="margin: 0 0 10px; font-size: 18px; opacity: 0.8;">5-Day Forecast</h3><div style="background: var(--bg); border-radius: 16px; padding: 10px;">${forecastHtml}</div>`; 
}

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    state.itineraryData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = cols[0].trim(), loc = cols[1].trim(), act = cols[2].trim(), time = cols[3].trim(), who = cols[4].trim(), addr = cols[5] || '';
        let isMatch = false; const whoL = who.toLowerCase(), filterL = filter.toLowerCase();
        if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true; 
        else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true; 
        else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

        if (isMatch) {
            const mapLink = "https://maps.google.com/?q=" + encodeURIComponent(addr || `${act} ${loc}`);
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            const cardHtml = `<div class="admin-card itin-card ${isCompleted?'completed':''}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding:20px; margin-bottom:16px; cursor:pointer;"><div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--ios-grey); padding-bottom:10px; margin-bottom:10px;"><strong style="font-size:15px;">${escapeHTML(time)}</strong></div><div style="font-size:17px; font-weight:900;">${escapeHTML(act)}</div><div style="font-size:12px; opacity:0.6;">${escapeHTML(who)}</div></div>`;
            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : (grouped['la'][d] = grouped['la'][d] || [], grouped['la'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : (grouped['utah'][d] = grouped['utah'][d] || [], grouped['utah'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : (grouped['vegas'][d] = grouped['vegas'][d] || [], grouped['vegas'][d].push(cardHtml)); }
        }
    });

    // THE FIX: Restored item counts
    const buildSec = (cityObj) => {
        let html = ''; for (const [date, cards] of Object.entries(cityObj)) {
            html += `<details class="day-group"><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}<span class="item-count">${cards.length} Items</span></span></summary><div class="day-content">${cards.join('')}</div></details>`;
        } return html;
    };
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); document.getElementById('la-completed-list').innerHTML = cLA;
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); document.getElementById('utah-completed-list').innerHTML = cUtah;
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); document.getElementById('vegas-completed-list').innerHTML = cVegas;
    document.querySelectorAll('.completed-section').forEach(sec => { sec.style.display = sec.querySelector('div:last-child').innerHTML ? 'block' : 'none'; });
}

export function renderTravelVault() { 
    if (!state.vaultAndStaysData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const display = document.getElementById('flights-vault-display');
    let html = ''; const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 2) return; 
        const fam = cols[0].trim(), type = cols[1].trim().toLowerCase(); 
        let isMatch = false; const filterL = filter.toLowerCase();
        if (filter === 'All' || fam.toLowerCase() === 'everyone') isMatch = true; 
        else if (fam.toLowerCase().includes(filterL)) isMatch = true; 
        else if (leech.includes(filterL) && fam.toLowerCase().includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && fam.toLowerCase().includes('murray')) isMatch = true;
        
        if (isMatch) {
            if (type === 'flight') {
                const date = cols[2], dep = cols[3], arr = cols[4], air = cols[5], fn = cols[6], ft = cols[7], term = cols[8], ref = cols[9];
                const flightId = btoa(encodeURIComponent(`${date}-${air}-${fn}`)).replace(/=/g, '');
                const activeTerm = (state.gateOverrides && state.gateOverrides[flightId]) ? state.gateOverrides[flightId] : term;
                html += `<div class="admin-card travel-card" data-type="flight" data-flightid="${flightId}" data-date="${date}" data-dep="${dep}" data-arr="${arr}" data-airline="${air}" data-fnum="${fn}" data-ftime="${ft}" data-term="${activeTerm}" data-ref="${ref}" style="border-left:5px solid var(--accent); cursor:pointer;"><div style="display:flex; justify-content:space-between;"><span>✈️ ${date}</span><strong>${air} ${fn}</strong></div><div style="font-size:18px; font-weight:900; margin-top:10px;">${dep} → ${arr}</div></div>`;
            } else if (type === 'car') {
                html += `<div class="admin-card travel-card" data-type="car" data-company="${cols[4]}" data-ploc="${cols[5]}" data-pdate="${cols[2]}" data-dloc="${cols[8]}" data-ddate="${cols[3]}" data-ref="${cols[9]}" style="border-left:5px solid #34c759; cursor:pointer;">🚗 ${cols[4]} Rental</div>`;
            }
        }
    }); display.innerHTML = html;
}

export function renderAccommodations() { 
    if (!state.vaultAndStaysData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    let htmlLA = '', htmlUtah = '', htmlVegas = '';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 2) return; 
        const fam = cols[0].trim(), type = cols[1].trim().toLowerCase(); 
        let isMatch = false; const filterL = filter.toLowerCase();
        if (filter === 'All' || fam.toLowerCase() === 'everyone') isMatch = true; 
        else if (fam.toLowerCase().includes(filterL)) isMatch = true; 
        else if (leech.includes(filterL) && fam.toLowerCase().includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && fam.toLowerCase().includes('murray')) isMatch = true;
        
        if (type === 'stay' && isMatch) {
            const addr = cols[4], img = cols[7], city = cols[3];
            const ui = `<div class="admin-card stay-card" data-fam="${fam}" data-addr="${addr}" data-img="${img}" data-link="${cols[6]||''}" style="padding:0; overflow:hidden; cursor:pointer;"><div style="height:100px; background:${img?`url('${img}') center/cover`:`var(--accent)`}; display:flex; align-items:flex-end; padding:20px;"><h3 style="margin:0; color:white; font-size:20px;">🏡 ${fam} Stay</h3></div></div>`;
            if(city.toLowerCase().includes('la')) htmlLA += ui; else if(city.toLowerCase().includes('utah')) htmlUtah += ui; else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;
        }
    });
    document.getElementById('la-home-card').innerHTML = htmlLA; document.getElementById('utah-home-card').innerHTML = htmlUtah; document.getElementById('vegas-home-card').innerHTML = htmlVegas;
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
    if(docs.length === 0) { gallery.innerHTML = '<div style="grid-column: span 2; opacity:0.5; text-align:center;">No docs yet.</div>'; return; }
    
    let html = '';
    docs.forEach(doc => {
        const isImg = doc.type.startsWith('image/');
        const bg = isImg ? `url(${doc.data})` : 'var(--ios-grey)';
        const icon = isImg ? '' : '📄';
        html += `<div class="wallet-item" style="background: ${bg};">${icon}<button class="delete-doc-btn" data-id="${doc.id}">×</button><a href="${doc.data}" download="${doc.name}" style="position:absolute; inset:0; z-index:1;"></a></div>`;
    });
    gallery.innerHTML = html;
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
        const conf = document.createElement('div');
        conf.className = 'particle confetti';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}

export function triggerEmojiRain(city) {
    if(navigator.vibrate) navigator.vibrate([30, 30]);
    const emojis = { 'la': ['🌴', '☀️', '🎬', '⭐', '🏄'], 'utah': ['⛰️', '🤠', '🏜️', '🥾', '🔥'], 'vegas': ['🎲', '🎰', '💸', '🃏', '🍸'] };
    const set = emojis[city] || ['✨'];
    for(let i=0; i<30; i++) {
        const em = document.createElement('div');
        em.className = 'particle emoji-drop';
        em.innerText = set[Math.floor(Math.random() * set.length)];
        em.style.left = Math.random() * 100 + 'vw';
        em.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(em);
        setTimeout(() => em.remove(), 4000);
    }
}

const hypeQuotes = [ "Prepare the Vegas bankroll! 💸", "Only the brave conquer Utah! ⛰️", "In-N-Out Burger is calling! 🍔", "USA 2026: Epic Mode Activated 🚀", "Passports? Check. Vibes? IMMACULATE. ✨", "Ready for the road trip of a lifetime? 🚗" ];

export function triggerHype() {
    if(navigator.vibrate) navigator.vibrate(40);
    const toast = document.getElementById('hype-toast');
    if(!toast) return;
    toast.innerText = hypeQuotes[Math.floor(Math.random() * hypeQuotes.length)];
    toast.style.display = 'block';
    toast.classList.remove('toast-exit');
    toast.classList.add('toast-enter');
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.style.display = 'none', 300);
    }, 3000);
}

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const wheel = document.getElementById('roulette-wheel');
    if(!wheel) return;
    
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it"];
    wheel.dataset.names = JSON.stringify(names);
    
    let gradient = [];
    let html = '';
    const sliceDeg = 360 / names.length;
    
    names.forEach((name, i) => {
        let color = i % 2 === 0 ? '#d0021b' : '#1c1c1e'; 
        if (name === "Split it") color = '#34c759'; 
        
        const startDeg = i * sliceDeg;
        const endDeg = (i + 1) * sliceDeg;
        gradient.push(`${color} ${startDeg}deg ${endDeg}deg`);
        
        const textRotate = startDeg + (sliceDeg / 2);
        html += `<div class="roulette-label" style="transform: translateX(-50%) rotate(${textRotate}deg);"><span>${name}</span></div>`;
    });
    
    wheel.style.background = `conic-gradient(${gradient.join(', ')})`;
    wheel.innerHTML = html;
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(0deg)`;
    wheel.dataset.currentRotation = 0;
    
    const resText = document.getElementById('roulette-result-text');
    if(resText) { resText.innerText = "Tap to Spin!"; resText.style.color = "white"; }
}

export function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const btn = document.getElementById('btn-spin-roulette');
    const resText = document.getElementById('roulette-result-text');
    if(!wheel || !btn || btn.disabled) return;
    
    btn.disabled = true; btn.style.opacity = '0.5';
    if(resText) { resText.innerText = "Spinning..."; resText.style.color = "rgba(255,255,255,0.7)"; }
    
    let names = JSON.parse(wheel.dataset.names || '[]');
    let currentRot = parseFloat(wheel.dataset.currentRotation || 0);
    
    const extraSpins = 360 * 6; // 6 full spins!
    const randomStop = Math.floor(Math.random() * 360);
    const totalRotation = currentRot + extraSpins + randomStop;
    
    wheel.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;
    wheel.dataset.currentRotation = totalRotation;
    
    // Math to track what is exactly under the pointer!
    const pointerAngle = (360 - (totalRotation % 360)) % 360;
    const sliceDeg = 360 / names.length;
    const winningIndex = Math.floor(pointerAngle / sliceDeg);
    const winner = names[winningIndex];
    
    let ticks = 0;
    const tickInterval = setInterval(() => {
        if(navigator.vibrate) navigator.vibrate(10);
        ticks++;
        if(ticks > 25) clearInterval(tickInterval);
    }, 150);

    setTimeout(() => {
        clearInterval(tickInterval);
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
        btn.disabled = false; btn.style.opacity = '1';
        if(resText) {
            resText.innerText = `${winner} Wins!`;
            resText.style.color = "#ffd60a"; 
            resText.style.transform = 'scale(1.2)';
            setTimeout(() => resText.style.transform = 'scale(1)', 200);
        }
        triggerConfetti();
    }, 4500);
}

let currentTipsCity = 'la';
export function openTipsModal(city) {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate(40);
    currentTipsCity = city.toLowerCase();
    const titles = { 'la': 'Los Angeles', 'utah': 'Utah', 'vegas': 'Las Vegas' };
    document.getElementById('tips-modal-title').innerHTML = `💡 ${titles[currentTipsCity]} Tips`;
    document.querySelectorAll('.tips-tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.cat === 'eating'); });
    renderTips('eating');
    const modal = document.getElementById('tips-modal');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTipsModal() {
    const modal = document.getElementById('tips-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function renderTips(category) {
    if (!state.vaultAndStaysData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const contentDiv = document.getElementById('tips-content'); let html = '';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

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
            html += `<div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 700; line-height: 1.5;">${escapeHTML(details)}<br>${badge}</div></div>`;
        }
    }); 
    contentDiv.innerHTML = html || `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">👻</span><div class="empty-text" style="font-size: 16px;">No tips saved!</div></div>`;
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('stay-modal');
    const hero = document.getElementById('stay-modal-hero');
    const title = document.getElementById('stay-modal-title');
    const address = document.getElementById('stay-modal-addr');
    const btns = document.getElementById('stay-modal-buttons');

    hero.style.backgroundImage = imgUrl && imgUrl !== "undefined" && imgUrl !== "" ? `url('${imgUrl}')` : `none`;
    if(!imgUrl || imgUrl === "undefined" || imgUrl === "") hero.style.backgroundColor = `var(--accent)`;
    
    title.innerText = `🏡 ${fam} Stay`; address.innerText = `📍 ${addr}`;
    
    let btnHtml = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1; padding: 16px; font-size: 16px;">🚗 Drive</button>`;
    if (listLink && listLink !== "undefined" && listLink !== "") { btnHtml += `<button class="action-btn link-btn" data-url="${listLink}" style="flex: 1; padding: 16px; font-size: 16px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>`; }
    btns.innerHTML = btnHtml;

    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeStayModal() {
    const modal = document.getElementById('stay-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function openTravelModal(cardData) {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('travel-modal');
    const wrapper = document.getElementById('travel-modal-wrapper');
    const content = document.getElementById('travel-modal-content');

    if (cardData.type === 'flight') {
        wrapper.style.background = 'transparent';
        wrapper.style.border = 'none';
        wrapper.style.boxShadow = 'none';
        
        const linkHtml = cardData.link !== '#' ? `<a href="${cardData.link}" target="_blank" style="color:white; text-decoration:underline;">${cardData.airline} ${cardData.fnum} ↗</a>` : `${cardData.airline} ${cardData.fnum}`;
        
        content.innerHTML = `
        <div class="flight-card" style="margin-bottom:0; box-shadow:none;">
            <div class="flight-header">
                <span class="flight-num">${linkHtml}</span>
                <span style="font-size:12px; font-weight:800; opacity:0.8; text-align: right;">${cardData.date} <br> TIME: ${cardData.ftime}</span>
            </div>
            <div class="flight-path" style="margin: 25px 0;">
                <div class="path-node"><span>From</span><strong style="font-size: 20px;">${cardData.dep}</strong></div>
                <div class="plane-icon"></div>
                <div class="path-node"><span>To</span><strong style="font-size: 20px;">${cardData.arr}</strong></div>
            </div>
            <div style="margin-top:15px; display:flex; justify-content: space-between; align-items:center; font-size:13px; font-weight:700; opacity:0.9;">
                <span>Term/Gate: <strong id="modal-gate-text" style="color: #ffd60a;">${cardData.term || "Check Screens"}</strong> <button class="edit-gate-btn action-btn" data-flightid="${cardData.flightid}" style="padding: 4px 10px; font-size: 11px; width: auto; margin: 0 0 0 10px; display: inline-block; background: rgba(255,255,255,0.2); color: white; box-shadow: none; border: 1px solid rgba(255,255,255,0.4);">✏️ Update</button></span>
                <span>Ref: ${cardData.ref}</span>
            </div>
            <div class="barcode"></div>
        </div>`;
    } else if (cardData.type === 'car') {
        wrapper.style.background = 'var(--card)';
        wrapper.style.border = '1px solid var(--ios-grey)';
        wrapper.style.boxShadow = '0 8px 24px var(--shadow)';

        content.innerHTML = `
        <div style="padding: 24px;">
            <div style="font-size:12px; font-weight:900; opacity:0.5; text-transform:uppercase; letter-spacing: 1px; margin-bottom: 15px;">🚗 Car Rental</div>
            <h3 style="margin: 0 0 20px; font-size: 24px; font-weight: 900;">${cardData.company}</h3>
            <div style="margin-bottom: 16px; padding-left: 12px; border-left: 3px solid var(--ios-grey);">
                <strong style="font-size: 14px;">Pick-up:</strong><br>
                <span style="font-size: 16px; font-weight: 800;">${cardData.ploc}</span><br>
                <span style="font-size:14px; font-weight:600; opacity:0.7;">${cardData.pdate} @ ${cardData.ptime}</span>
            </div>
            <div style="margin-bottom: 20px; padding-left: 12px; border-left: 3px solid var(--ios-grey);">
                <strong style="font-size: 14px;">Drop-off:</strong><br>
                <span style="font-size: 16px; font-weight: 800;">${cardData.dloc}</span><br>
                <span style="font-size:14px; font-weight:600; opacity:0.7;">${cardData.ddate} @ ${cardData.dtime}</span>
            </div>
            <div style="background: rgba(0,0,0,0.05); padding: 12px; border-radius: 12px; font-size: 15px;">
                <strong>Ref:</strong> <span style="color: var(--accent); font-weight: 800;">${cardData.ref}</span>
            </div>
        </div>`;
    }

    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTravelModal() {
    const modal = document.getElementById('travel-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}
