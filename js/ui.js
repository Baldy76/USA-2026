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
    const activePage = document.querySelector('.tab-content.active')?.id || 'home';
    updateMetaThemeColor(activePage, isDark);
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

    if (!state.itineraryData || state.itineraryData.length === 0) {
        titleEl.innerText = "No upcoming plans"; timeEl.innerText = "Add something to the sheet!"; return;
    }

    const now = new Date().getTime();
    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech'];
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    let upcoming = [];
    state.itineraryData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); 
        const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim();
        
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
        const next = upcoming[0];
        titleEl.innerText = next.act;
        const isToday = new Date(next.timestamp).toDateString() === new Date().toDateString();
        const datePrefix = isToday ? "Today" : next.date;
        let locFormat = "📍 " + (next.loc.toLowerCase().includes('la') ? 'LA' : next.loc.toLowerCase().includes('utah') ? 'Utah' : next.loc.toLowerCase().includes('vegas') ? 'Vegas' : next.loc);
        timeEl.innerText = `${datePrefix} @ ${next.time} • ${locFormat}`;
    } else {
        titleEl.innerText = "Trip Complete!"; timeEl.innerText = "Time to go home ✈️";
    }
}

export function convertCurrency() { 
    const usdInput = document.getElementById('usd-input');
    const clearBtn = document.getElementById('clear-usd');
    const usd = parseFloat(usdInput?.value);
    
    // THE FIX: Grabs the live global window rate, bypassing module caches
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    
    if (clearBtn) clearBtn.style.display = usdInput?.value ? 'flex' : 'none';
    
    if(document.getElementById('gbp-output')) {
        if(!isNaN(usd)) {
            document.getElementById('gbp-output').innerText = `£${(usd / rate).toFixed(2)}`;
        } else {
            document.getElementById('gbp-output').innerText = `£0.00`;
        }
    }
}

export let currentTipPercent = 18;
export function setTip(percent, btnElement) { 
    currentTipPercent = percent; document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); calculateTip(); 
}

export function calculateTip() { 
    const b = parseFloat(document.getElementById('bill-total')?.value) || 0;
    const splitBtn = document.querySelector('.split-btn.active');
    const s = splitBtn ? parseInt(splitBtn.dataset.split) : 2;
    
    // THE FIX: Grabs the live global window rate
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    
    const t = b * (1 + (currentTipPercent / 100));
    const usd = t / s;
    const gbp = usd / rate; 
    
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
    renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); renderUpNext();
}

export function clearCustomFamilies() {
    if(confirm("Remove all old saved names from this device?")) {
        localStorage.removeItem('customFamilies'); localStorage.removeItem('appUser'); localStorage.removeItem('savedFamilyFilter');
        window.location.reload(); 
    }
}

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨' }; return m[c] || '🌤️'; };

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
        const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
        return `<div class="WTH-card" style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid var(--ios-grey); align-items: center;"><span style="font-weight: 800; opacity: 0.7;">${dayName}</span><span style="font-size: 24px;">${getWeatherIcon(day.weather[0].icon)}</span><span style="font-weight: 900; font-size: 16px;">${Math.round(day.main.temp)}°C</span></div>`; 
    }).join('');
    const wDash = document.getElementById('WTH-dashboard');
    if (wDash) wDash.innerHTML = `<div style="background: linear-gradient(135deg, rgba(0,122,255,0.1), rgba(0,122,255,0.05)); border-radius: 20px; padding: 30px 20px; text-align: center; margin-bottom: 20px; border: 2px solid var(--accent);"><div style="font-size: 70px; line-height: 1;">${getWeatherIcon(d.weather[0].icon)}</div><div style="font-size: 48px; font-weight: 900; color: var(--accent); margin: 10px 0;">${Math.round(d.main.temp)}°C</div><div style="text-transform: capitalize; font-weight: 700;">${d.weather[0].description}</div><div style="opacity: 0.5; margin-top: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(locName)}</div></div><h3 style="margin: 0 0 10px; font-size: 18px; opacity: 0.8;">5-Day Forecast</h3><div style="background: var(--bg); border-radius: 16px; padding: 10px;">${forecastHtml}</div>`; 
}

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    const now = new Date();
    const nowTime = now.getTime();
    const todayStr = now.toDateString(); 

    const sortedData = [...state.itineraryData].sort((a, b) => {
        const dtA = parseDateTime(a[0] || '', a[3] || '23:59') || Number.MAX_SAFE_INTEGER; 
        const dtB = parseDateTime(b[0] || '', b[3] || '23:59') || Number.MAX_SAFE_INTEGER;
        return dtA - dtB;
    });

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
            
            let isHappening = false;
            const taskDateObj = parseDateTime(d, time);
            if (taskDateObj && !isCompleted) {
                if (nowTime >= taskDateObj && nowTime < taskDateObj + (90 * 60000)) {
                    isHappening = true;
                }
            }
            
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
                        ${addr ? `<div style="font-size: 13px; font-weight: 700; opacity: 0.7; margin-top: 10px;"><a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none;">📍 Get Directions</a></div>` : ''}
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
            let dObj = new Date(date);
            let isOpen = (!isNaN(dObj) && dObj.toDateString() === todayStr) ? 'open' : '';
            html += `<details class="day-group" ${isOpen}><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}<span class="item-count">${cards.length} Items</span></span></summary><div class="day-content timeline">${cards.join('')}</div></details>`;
        } return html;
    };
    
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); 
    document.getElementById('la-completed-list').innerHTML = cLA ? `<div class="timeline">${cLA}</div>` : '';
    
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); 
    document.getElementById('utah-completed-list').innerHTML = cUtah ? `<div class="timeline">${cUtah}</div>` : '';
    
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); 
    document.getElementById('vegas-completed-list').innerHTML = cVegas ? `<div class="timeline">${cVegas}</div>` : '';
    
    document.querySelectorAll('.completed-section').forEach(sec => { sec.style.display = sec.querySelector('.timeline')?.innerHTML ? 'block' : 'none'; });
}

export function renderTravelVault() { 
    if (!state.vaultAndStaysData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const display = document.getElementById('flights-vault-display'); const emptyState = document.getElementById('empty-vault-state');
    if(!display) return; let html = ''; let hasData = false; const sortedData = [...state.vaultAndStaysData].sort((a,b) => parseDateTime(a[2]||'', null) - parseDateTime(b[2]||'', null));
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];
    
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

                html += `
                <div class="flip-container travel-card">
                    <div class="flip-card-inner">
                        <div class="flip-front" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">✈️ Flight • ${date}</div>
                                <div style="font-size: 11px; font-weight: 900; opacity: 0.7;">${escapeHTML(fam)}</div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                <strong style="font-size: 22px; font-weight: 900;">${dep} → ${arr}</strong>
                                <div style="text-align: right;">
                                    <div style="color: #bae6fd; font-weight: 800;">${airline} ${fnum}</div>
                                    <div style="font-size: 12px; opacity: 0.8; font-weight: 700;">${ftime}</div>
                                </div>
                            </div>
                            <div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-align: center; margin-top: 15px;">Tap for Boarding Pass ⤵</div>
                        </div>
                        <div class="flip-back">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">
                                <span>Terminal / Gate</span>
                                <span>Ref: ${escapeHTML(cols[9]?.trim() || 'N/A')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
                                <div id="gate-text-${flightId}" style="font-size: 18px; font-weight: 900; color: #ffd60a; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${activeTerm || 'Check Board'}</div>
                                <button class="edit-gate-btn action-btn" data-flightid="${flightId}" style="padding: 6px 12px; font-size: 11px; width: auto; margin: 0; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); box-shadow: none;">✏️ Edit</button>
                            </div>
                            <div style="font-size: 12px; font-weight: 700; margin-bottom: 15px;">
                                <a href="${flLink}" target="_blank" style="color: white; text-decoration: underline;">Track Flight ↗</a>
                            </div>
                            <div class="barcode" style="background: repeating-linear-gradient(90deg, white, white 2px, transparent 2px, transparent 4px, white 4px, white 6px, transparent 6px, transparent 10px); height: 30px; opacity: 0.8; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>`;
            } else if (type === 'car') {
                hasData = true; const pdate = escapeHTML(cols[2]?.trim()||''); const company = escapeHTML(cols[4]?.trim()||''); const ploc = escapeHTML(cols[5]?.trim()||'');
                html += `
                <div class="flip-container travel-card">
                    <div class="flip-card-inner">
                        <div class="flip-front" style="background: linear-gradient(135deg, #34c759, #28a745); color: white; border: none;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <div style="font-size: 11px; font-weight: 900; opacity: 0.7; text-transform: uppercase;">🚗 Car Rental • ${pdate}</div>
                                <div style="font-size: 11px; font-weight: 900; opacity: 0.7;">${escapeHTML(fam)}</div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                <strong style="font-size: 22px; font-weight: 900;">${company}</strong>
                                <div style="text-align: right;">
                                    <div style="color: #bbf7d0; font-weight: 800;">Pick-up</div>
                                    <div style="font-size: 12px; opacity: 0.8; font-weight: 700;">${ploc}</div>
                                </div>
                            </div>
                            <div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.6); text-align: center; margin-top: 15px;">Tap for Details ⤵</div>
                        </div>
                        <div class="flip-back car-back" style="background: linear-gradient(135deg, #34c759, #28a745);">
                            <div style="font-size: 12px; font-weight: 800; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; justify-content: space-between;">
                                <span>Booking Details</span>
                                <span>Ref: ${escapeHTML(cols[9]?.trim() || 'N/A')}</span>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <div style="font-size: 11px; opacity: 0.8; font-weight: 700;">PICK-UP</div>
                                <div style="font-size: 14px; font-weight: 900;">${ploc}</div>
                                <div style="font-size: 12px; opacity: 0.9;">${pdate} @ ${escapeHTML(cols[6]?.trim() || '')}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; opacity: 0.8; font-weight: 700;">DROP-OFF</div>
                                <div style="font-size: 14px; font-weight: 900;">${escapeHTML(cols[8]?.trim())||ploc}</div>
                                <div style="font-size: 12px; opacity: 0.9;">${escapeHTML(cols[3]?.trim() || '')} @ ${escapeHTML(cols[7]?.trim() || '')}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        }
    }); display.innerHTML = html; if(emptyState) emptyState.style.display = hasData ? 'none' : 'flex';
}

export function renderAccommodations() { 
    if (!state.vaultAndStaysData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    let htmlLA = '', htmlUtah = '', htmlVegas = '';
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
    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA; const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
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
    
    renderScoreboard();
}

export function renderScoreboard() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const board = document.getElementById('roulette-scoreboard');
    if (!board) return;
    
    let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
    let currentTallies = tallies[mode] || {};
    
    let html = '';
    for (const [name, count] of Object.entries(currentTallies)) {
        if (count > 0) {
            html += `<div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px;">${escapeHTML(name)} <span style="background: var(--card); color: var(--accent); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px;">${count}</span></div>`;
        }
    }
    if (html === '') {
        html = `<div style="font-size: 11px; opacity: 0.6; font-weight: 700; width: 100%;">No spins yet. Let's play!</div>`;
    }
    board.innerHTML = html;
}

export function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const btn = document.getElementById('btn-spin-roulette');
    const resText = document.getElementById('roulette-result-text');
    if(!wheel || !btn || btn.disabled) return;
    
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    
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
        
        let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
        if (!tallies[mode]) tallies[mode] = {};
        tallies[mode][winner] = (tallies[mode][winner] || 0) + 1;
        localStorage.setItem('rouletteTallies', JSON.stringify(tallies));
        renderScoreboard();
        
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

export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal');
    modal.dataset.location = location;
    
    let displayLoc = location.toUpperCase();
    if (location === 'la') displayLoc = 'Los Angeles';
    else if (location === 'vegas') displayLoc = 'Las Vegas';
    
    document.getElementById('quote-modal-title').innerText = `💬 ${displayLoc} Quotes`;
    document.getElementById('new-quote-author').value = '';
    document.getElementById('new-quote-text').value = '';
    
    renderQuotes(location);
    modal.style.display = 'flex'; 
    setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const list = document.getElementById('quote-list');
    const quotes = state.quotesData || [];
    const filtered = quotes.filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 20px;"><div class="empty-text">No quotes yet.</div></div>`;
        return;
    }
    
    list.innerHTML = filtered.map(q => `
        <div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);">
            <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 16px; line-height: 1.4; margin-bottom: 8px;">"${escapeHTML(q[1])}"</div>
            <div style="text-align: right; font-size: 11px; font-weight: 800; opacity: 0.6; text-transform: uppercase;">— ${escapeHTML(q[2])}</div>
        </div>
    `).reverse().join('');
}

export async function submitNewQuote() {
    const author = document.getElementById('new-quote-author').value.trim();
    const text = document.getElementById('new-quote-text').value.trim();
    const modal = document.getElementById('quote-modal');
    const location = modal.dataset.location;
    
    if (!text || !author) {
        alert("Please enter both who said it and what they said!");
        return;
    }
    
    if (navigator.vibrate) navigator.vibrate(20);
    
    await saveQuoteToSheet(location, text, author);
    
    document.getElementById('new-quote-author').value = '';
    document.getElementById('new-quote-text').value = '';
    
    renderQuotes(location);
    triggerConfetti();
}

export function closeQuoteModal() {
    const modal = document.getElementById('quote-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function openManageQuotesModal() {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('manage-quotes-modal');
    renderAdminQuotes();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

export function closeManageQuotesModal() {
    const modal = document.getElementById('manage-quotes-modal');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function renderAdminQuotes() {
    const list = document.getElementById('admin-quotes-list');
    if (!state.quotesData || state.quotesData.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 20px;">No quotes to manage.</div>`;
        return;
    }
    
    list.innerHTML = state.quotesData.map((q, index) => `
        <div style="background: var(--bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ios-grey);">
            <div style="flex: 1; padding-right: 10px;">
                <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--text);">"${escapeHTML(q[1])}"</div>
                <div style="font-size: 11px; opacity: 0.6; color: var(--text);">— ${escapeHTML(q[2])} (${escapeHTML(q[0]).toUpperCase()})</div>
            </div>
            <button class="delete-quote-btn" data-loc="${escapeHTML(q[0])}" data-quote="${escapeHTML(q[1])}" data-author="${escapeHTML(q[2])}" style="background: #ff3b30; color: white; border: none; border-radius: 8px; padding: 10px 12px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3);">🗑️</button>
        </div>
    `).reverse().join('');
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

export function openGateModal(flightId) {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate(20);
    
    const modal = document.getElementById('gate-modal');
    modal.dataset.flightid = flightId;
    
    document.getElementById('gate-input-term').value = '';
    document.getElementById('gate-input-gate').value = '';
    
    modal.style.display = 'flex'; 
    setTimeout(() => modal.classList.add('active'), 10);
    
    setTimeout(() => document.getElementById('gate-input-term').focus(), 300);
}

export function closeGateModal() {
    const modal = document.getElementById('gate-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export function renderAnchor() {
    const container = document.getElementById('anchor-container');
    if (!container) return;

    const saved = localStorage.getItem('carAnchor');
    if (saved) {
        const data = JSON.parse(saved);
        container.innerHTML = `
        <div class="admin-card pulse-btn" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #34c759, #28a745); border:none; box-shadow: 0 8px 24px rgba(52, 199, 89, 0.4); display: flex; align-items: center; justify-content: space-between; border-radius: 50px;">
            <div id="btn-find-car" data-lat="${data.lat}" data-lon="${data.lon}" style="cursor: pointer; display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="font-size: 20px;">🧭</span>
                <span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Dude where's my car?</span>
            </div>
            <button id="btn-clear-anchor" style="background: #ff3b30; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3); z-index: 10; margin-left: 10px;">Found it</button>
        </div>`;
    } else {
        container.innerHTML = `
        <div class="admin-card" style="margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border:none; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3); text-align: center; border-radius: 50px;">
            <div id="btn-drop-anchor" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 20px;">⚓🚗</span>
                <span style="font-size: 14px; font-weight: 900; color: white; letter-spacing: 0.5px;">Drop Car Anchor</span>
            </div>
        </div>`;
    }
}
