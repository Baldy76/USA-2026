// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); 
let liveExchangeRate = 1.27; 

// ==========================================
// 0. RING-FENCE ERROR HANDLER
// ==========================================
// This ensures one broken feature NEVER breaks the app.
function safeRun(moduleName, func) {
    try {
        func();
    } catch (error) {
        console.error(`[MODULE ISOLATED] Error in ${moduleName}:`, error);
    }
}

async function safeRunAsync(moduleName, func) {
    try {
        await func();
    } catch (error) {
        console.error(`[MODULE ISOLATED] Async error in ${moduleName}:`, error);
    }
}

const escapeHTML = (str) => {
    if (!str) return "";
    const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
};

// ==========================================
// 1. THEME & NAVIGATION (Core Module)
// ==========================================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    const activePage = document.querySelector('.page[style*="display: block"]')?.id || 'home';
    updateMetaThemeColor(activePage, isDark);
}

window.setThemeMode = (isDark) => { safeRun('ThemeMode', () => {
    applyTheme(isDark); 
    localStorage.setItem('HolidayPlanner_Theme', isDark); 
})};

function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ff9500';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    
    const meta = document.getElementById('theme-meta'); 
    if (meta) meta.content = metaColor;
}

function showPage(event, pageId) { safeRun('Navigation', () => {
    document.body.classList.remove('theme-la', 'theme-utah', 'theme-vegas', 'theme-flights');
    if (pageId === 'la') document.body.classList.add('theme-la');
    else if (pageId === 'utah') document.body.classList.add('theme-utah');
    else if (pageId === 'vegas') document.body.classList.add('theme-vegas');
    else if (pageId === 'flights') document.body.classList.add('theme-flights');
    
    updateMetaThemeColor(pageId);

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget && event.currentTarget.classList.contains('nav-btn')) {
        event.currentTarget.classList.add('active');
    }

    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
        page.classList.remove('fade-in');
    });

    const activePage = document.getElementById(pageId);
    if(activePage) {
        activePage.style.display = 'block';
        window.scrollTo(0, 0);
        requestAnimationFrame(() => activePage.classList.add('fade-in'));
    }
})};

function openWeatherPage() { safeRun('OpenWeather', () => {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => { page.style.display = 'none'; page.classList.remove('fade-in'); });
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    const wPage = document.getElementById('weather-root');
    if(wPage) {
        wPage.style.display = 'block';
        window.scrollTo(0, 0);
        requestAnimationFrame(() => wPage.classList.add('fade-in'));
    }
})};

function switchDayView(day) { safeRun('SwitchDay', () => {
    const todayView = document.getElementById('today-view');
    const tomorrowView = document.getElementById('tomorrow-view');
    const btnToday = document.getElementById('btn-show-today');
    const btnTomorrow = document.getElementById('btn-show-tomorrow');
    if(!todayView || !tomorrowView) return;

    todayView.classList.remove('fade-in'); tomorrowView.classList.remove('fade-in');

    if (day === 'today') {
        todayView.style.display = 'block'; tomorrowView.style.display = 'none';
        if(btnToday) { btnToday.style.backgroundColor = 'var(--accent)'; btnToday.style.color = 'white'; }
        if(btnTomorrow) { btnTomorrow.style.backgroundColor = 'var(--ios-grey)'; btnTomorrow.style.color = 'var(--text)'; }
        requestAnimationFrame(() => todayView.classList.add('fade-in'));
    } else {
        todayView.style.display = 'none'; tomorrowView.style.display = 'block';
        if(btnTomorrow) { btnTomorrow.style.backgroundColor = 'var(--accent)'; btnTomorrow.style.color = 'white'; }
        if(btnToday) { btnToday.style.backgroundColor = 'var(--ios-grey)'; btnToday.style.color = 'var(--text)'; }
        requestAnimationFrame(() => tomorrowView.classList.add('fade-in'));
    }
})};

function toggleComplete(element) { safeRun('ToggleComplete', () => {
    if (element.style.opacity === '0.5') { element.style.opacity = '1'; element.style.transform = 'scale(1)'; } 
    else { element.style.opacity = '0.5'; element.style.transform = 'scale(0.98)'; }
})};

// ==========================================
// 2. DASHBOARD TOOLS (Calculators & Clocks)
// ==========================================
let currentTipPercent = 18;

function setTip(percent, btnElement) { safeRun('SetTip', () => {
    currentTipPercent = percent;
    document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    calculateTip();
})};

function calculateTip() { safeRun('CalcTip', () => {
    const billTotal = parseFloat(document.getElementById('bill-total')?.value) || 0;
    const splitWays = parseInt(document.getElementById('split-ways')?.value) || 1;
    const totalWithTip = billTotal * (1 + (currentTipPercent / 100));
    const perFamilyUsd = totalWithTip / splitWays;
    const perFamilyGbp = perFamilyUsd / liveExchangeRate; 
    
    if(document.getElementById('tip-usd')) document.getElementById('tip-usd').innerText = `$${perFamilyUsd.toFixed(2)}`;
    if(document.getElementById('tip-gbp')) document.getElementById('tip-gbp').innerText = `£${perFamilyGbp.toFixed(2)}`;
})};

function convertCurrency() { safeRun('ConvertCurr', () => {
    const usd = document.getElementById('usd-input')?.value;
    if(document.getElementById('gbp-output')) {
        document.getElementById('gbp-output').innerText = usd ? `£${(usd / liveExchangeRate).toFixed(2)}` : `£0.00`;
    }
})};

async function initLiveCurrency() {
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
        const data = await response.json();
        if (data.rates && data.rates.USD) {
            liveExchangeRate = data.rates.USD;
            const tag = document.getElementById('live-rate-tag');
            if(tag) tag.innerText = `RATE: £1 = $${liveExchangeRate.toFixed(2)}`;
        }
    } catch (error) { 
        const tag = document.getElementById('live-rate-tag');
        if(tag) tag.innerText = `RATE: £1 = $${liveExchangeRate}`; 
    }
}

function updateTimeAndCountdown() { safeRun('Clocks', () => {
    const now = new Date();
    const cContainer = document.getElementById('countdown-display');
    const clockContainer = document.getElementById('dual-clocks');
    if(!cContainer || !clockContainer) return;

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString(undefined, options);
    
    if (document.getElementById('cd-date')) document.getElementById('cd-date').textContent = dateString;
    if (document.getElementById('clock-date')) document.getElementById('clock-date').textContent = dateString;

    const savedStart = localStorage.getItem('tripStartDate');
    if (savedStart) {
        const input = document.getElementById('trip-start-date');
        if(input) input.value = savedStart;
        const tripDate = new Date(savedStart);
        if (!isNaN(tripDate.getTime())) {
            tripDate.setHours(0,0,0,0);
            const diff = tripDate - now;
            if (diff > 0) {
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                const cdText = document.getElementById('cd-text');
                if(cdText) cdText.innerHTML = `🚀 ${days} Days to Go!`;
                cContainer.style.display = 'block'; clockContainer.style.display = 'none';
                return; 
            }
        }
    } 
    
    cContainer.style.display = 'none'; clockContainer.style.display = 'block';
    
    const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
    const ptTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(now);
    
    if(document.getElementById('clock-uk')) document.getElementById('clock-uk').innerText = ukTime;
    if(document.getElementById('clock-local')) document.getElementById('clock-local').innerText = ptTime;
})};

function saveTripSettings() { safeRun('SaveTrip', () => {
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
    updateTimeAndCountdown(); 
})};

// ==========================================
// 3. FLIGHT VAULT
// ==========================================
function saveTravelVault() { safeRun('SaveVault', () => {
    const flight = {
        dep: document.getElementById('vault-dep')?.value.trim() || '',
        arr: document.getElementById('vault-arr')?.value.trim() || '',
        airline: document.getElementById('vault-airline')?.value.trim().toUpperCase() || '',
        fnum: document.getElementById('vault-fnum')?.value.trim() || '',
        term: document.getElementById('vault-term')?.value.trim() || '',
        time: document.getElementById('vault-time')?.value.trim() || ''
    };
    const car = document.getElementById('vault-car')?.value || '';
    
    localStorage.setItem('travelVault', JSON.stringify({flight, car}));
    
    const msg = document.getElementById('vault-save-msg');
    if(msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500); }
    renderTravelVault();
})};

function renderTravelVault() { safeRun('RenderVault', () => {
    const vault = JSON.parse(localStorage.getItem('travelVault')) || null;
    const display = document.getElementById('today-vault-display');
    const emptyState = document.getElementById('empty-vault-state');
    if(!display) return;

    if (vault && (vault.flight?.dep || vault.car)) {
        if (emptyState) emptyState.style.display = 'none';
        let f = vault.flight || { dep:'', arr:'', airline:'', fnum:'', term:'', time:'' };
        const flightTime = f.time || f.ref || '';

        ['dep','arr','airline','fnum','term'].forEach(key => {
            const el = document.getElementById(`vault-${key}`);
            if(el) el.value = f[key] || '';
        });
        const tEl = document.getElementById('vault-time'); if(tEl) tEl.value = flightTime;
        const cEl = document.getElementById('vault-car'); if(cEl) cEl.value = vault.car || '';

        let flightHtml = "";
        if (f.dep || f.arr || f.fnum) {
            const searchStr = (f.airline + f.fnum).replace(/\s+/g, '');
            const trackerLink = searchStr ? `https://flightaware.com/live/flight/${searchStr}` : '#';
            const linkHtml = searchStr ? `<a href="${escapeHTML(trackerLink)}" target="_blank" class="flight-tracker-link">${escapeHTML(f.airline)} ${escapeHTML(f.fnum)} ↗</a>` : `${escapeHTML(f.airline)} ${escapeHTML(f.fnum)}`;

            flightHtml = `
            <div class="flight-card">
                <div class="flight-header">
                    <span class="flight-num">${linkHtml}</span>
                    <span style="font-size:12px; font-weight:800; opacity:0.8;">TIME: ${escapeHTML(flightTime)}</span>
                </div>
                <div class="flight-path">
                    <div class="path-node"><span>From</span><strong>${escapeHTML(f.dep)}</strong></div>
                    <div class="plane-icon"></div>
                    <div class="path-node"><span>To</span><strong>${escapeHTML(f.arr)}</strong></div>
                </div>
                <div style="margin-top:15px; display:flex; justify-content: space-between; align-items:center; font-size:13px; font-weight:700; opacity:0.9;">
                    <span>Terminal/Gate: ${escapeHTML(f.term) || "Check Screens"}</span>
                </div>
                <div class="barcode"></div>
            </div>`;
        }

        display.innerHTML = `
            ${flightHtml}
            ${vault.car ? `<div class="admin-card" style="margin-bottom:24px; border-left: 5px solid var(--accent);">
                <div style="font-size:11px; font-weight:800; opacity:0.5; text-transform:uppercase;">🚗 Rental Reference</div>
                <div style="font-size:16px; font-weight:700; margin-top:5px; white-space: pre-wrap;">${escapeHTML(vault.car)}</div>
            </div>` : ''}
        `;
    } else { 
        display.innerHTML = ''; 
        if (emptyState) emptyState.style.display = 'flex';
    }
})};

// ==========================================
// 4. DATA ENGINE (Sheets & Accommodations)
// ==========================================
async function loadItinerary() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split('\n').slice(1); 
        let rawData = rows.filter(row => row.trim() !== ''); 
        
        function parseDateTime(dateStr, timeStr) {
            let d = new Date(`${dateStr || ''} ${timeStr || ''}`);
            if (isNaN(d)) {
                const parts = (dateStr||'').split(/[-/]/);
                if (parts.length === 3) d = new Date(`${parts[2]}/${parts[1]}/${parts[0]} ${timeStr||''}`);
            }
            return isNaN(d) ? 0 : d.getTime();
        }

        rawData.sort((a, b) => {
            const ca = a.split(','); const cb = b.split(',');
            if (ca.length < 5 || cb.length < 5) return 0;
            return parseDateTime(ca[0], ca[3]) - parseDateTime(cb[0], cb[3]);
        });

        itineraryData = rawData;
        itineraryData.forEach(row => {
            const col = row.split(',');
            if (col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') {
                sheetFamilies.add(col[4].trim());
            }
        });
        
        safeRun('PopulateDropdown', populateDropdown);
        safeRun('RenderItinerary', renderItinerary);
    } catch (e) { console.error("[MODULE ISOLATED] Itinerary failed:", e); }
}

function populateDropdown() {
    const mainSelect = document.getElementById('family-selector');
    const accSelect = document.getElementById('acc-family'); 
    if(mainSelect) mainSelect.innerHTML = '<option value="All">Show All Activities</option>';
    if (accSelect) accSelect.innerHTML = '';
    
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);
    
    allFamilies.forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f;
        if(mainSelect) mainSelect.appendChild(opt);
        if (accSelect) accSelect.appendChild(opt.cloneNode(true));
    });
    
    const savedFamily = localStorage.getItem('savedFamilyFilter');
    if (savedFamily && mainSelect) mainSelect.value = savedFamily;
}

function addCustomFamily() { safeRun('AddFamily', () => {
    const name = document.getElementById('new-family-name')?.value.trim();
    if (name) {
        let custom = JSON.parse(localStorage.getItem('customFamilies')) || [];
        if (!custom.includes(name)) {
            custom.push(name);
            localStorage.setItem('customFamilies', JSON.stringify(custom));
            populateDropdown();
            const sel = document.getElementById('family-selector');
            if(sel) sel.value = name;
            updateFamilyFilter();
        }
        document.getElementById('new-family-name').value = ''; 
    }
})};

function saveAccommodation() { safeRun('SaveAcc', () => {
    const city = document.getElementById('acc-city')?.value;
    const family = document.getElementById('acc-family')?.value;
    const address = document.getElementById('acc-address')?.value.trim();
    const start = document.getElementById('acc-start')?.value;
    const end = document.getElementById('acc-end')?.value;
    const link = document.getElementById('acc-link')?.value.trim();
    const image = document.getElementById('acc-image')?.value.trim();
    
    if (!family || !address || !start || !end) { alert("Missing details!"); return; }
    
    let accData = JSON.parse(localStorage.getItem('accommodations')) || {};
    if (!accData[city]) accData[city] = {};
    accData[city][family] = { address, start, end, link, image };
    localStorage.setItem('accommodations', JSON.stringify(accData));
    
    ['acc-address', 'acc-start', 'acc-end', 'acc-link', 'acc-image'].forEach(id => {
        const el = document.getElementById(id); if(el) el.value = '';
    });
    
    renderAccommodations();
})};

function renderAccommodations() {
    const filter = document.getElementById('family-selector')?.value || 'All';
    const data = JSON.parse(localStorage.getItem('accommodations')) || {};
    const cities = [{ id: 'la', key: 'LA' }, { id: 'utah', key: 'Utah' }, { id: 'vegas', key: 'Vegas' }];
    const today = new Date(); today.setHours(0,0,0,0);
    let todayHtml = '';

    cities.forEach(c => {
        const container = document.getElementById(`${c.id}-home-card`);
        if (!container) return;
        
        let cHtml = '';
        const cityData = data[c.key] || {};
        
        const processCard = (f, acc) => {
            const address = acc.address || acc;
            const headerBg = acc.image ? `url('${acc.image}') center/cover` : `var(--accent)`;
            const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
            const ui = `
                <div class="admin-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
                    <div style="height: 140px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                        <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(f)} Stay</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="font-size: 14px; opacity: 0.6; font-weight: 700; margin-bottom: 15px;">📍 ${escapeHTML(address)}</div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.open('${mapLink}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px;">🚗 Drive</button>
                            ${acc.link ? `<button onclick="window.open('${acc.link}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>` : ''}
                        </div>
                    </div>
                </div>`;
            cHtml += ui;
            if (acc.start && acc.end) {
                const sDate = new Date(acc.start); const eDate = new Date(acc.end);
                sDate.setHours(0,0,0,0); eDate.setHours(23,59,59,999);
                if (today >= sDate && today <= eDate) todayHtml += ui;
            }
        };

        if (filter !== 'All' && cityData[filter]) processCard(filter, cityData[filter]);
        else if (filter === 'All') Object.entries(cityData).forEach(([f, acc]) => processCard(f, acc));
        container.innerHTML = cHtml;
    });
    
    const todayCard = document.getElementById('today-home-card');
    if (todayCard) todayCard.innerHTML = todayHtml;
}

function renderItinerary() {
    const filter = document.getElementById('family-selector')?.value || 'All';
    let hLA = '', hUtah = '', hVegas = '', hToday = '', hTomorrow = '';
    let lLA = '', lUtah = '', lVegas = '';
    let tCount = 0, tmCount = 0;
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); 
    
    itineraryData.forEach(row => {
        const col = row.split(','); 
        if(col.length >= 5) {
            const d = col[0].trim(); const loc = col[1].trim(); const act = col[2].trim();
            const time = col[3].trim(); const who = col[4].trim(); 
            const addr = (col.length >= 6) ? col[5].trim() : '';
            
            if (filter === 'All' || who.toLowerCase() === filter.toLowerCase() || who.toLowerCase() === 'everyone') {
                const searchLoc = addr !== '' ? addr : `${act} ${loc}`;
                const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchLoc)}`;
                const addressDisplayHtml = addr ? `<br><span style="font-size: 13px; font-weight: 600; opacity: 0.8; display: inline-block; margin-top: 6px;">🗺️ ${escapeHTML(addr)}</span>` : '';
                const cardHtml = `
                    <div class="admin-card" style="text-align: left; transition: all 0.3s ease; cursor: pointer; padding: 20px; margin-bottom: 16px;" onclick="toggleComplete(this)">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>
                            <span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; color: var(--text);">${escapeHTML(who)}</span>
                        </div>
                        <div style="font-size: 17px; font-weight: 900; line-height: 1.3; margin-bottom: 8px;">${escapeHTML(act)}</div>
                        <div style="font-size: 14px; font-weight: 700; opacity: 0.7; line-height: 1.5;">
                            📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;" onclick="event.stopPropagation()">Get Directions</a>
                            ${addressDisplayHtml}
                        </div>
                    </div>`;

                if (loc.toLowerCase().includes('la')) { if(d !== lLA) { hLA += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lLA = d; } hLA += cardHtml; }
                else if (loc.toLowerCase().includes('utah')) { if(d !== lUtah) { hUtah += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lUtah = d; } hUtah += cardHtml; }
                else if (loc.toLowerCase().includes('vegas')) { if(d !== lVegas) { hVegas += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lVegas = d; } hVegas += cardHtml; }
                
                const isDateMatch = (s, target) => { let dt = new Date(s); if(isNaN(dt)) { const p = s.split(/[-/]/); dt = new Date(`${p[2]}-${p[1]}-${p[0]}`); } return dt.toDateString() === target.toDateString(); };
                if (isDateMatch(d, today)) { hToday += cardHtml; tCount++; } 
                else if (isDateMatch(d, tomorrow)) { hTomorrow += cardHtml; tmCount++; }
            }
        }
    });
    
    if(document.getElementById('la-itinerary')) document.getElementById('la-itinerary').innerHTML = hLA || '<div class="empty-state">No activities</div>';
    if(document.getElementById('utah-itinerary')) document.getElementById('utah-itinerary').innerHTML = hUtah || '<div class="empty-state">No activities</div>';
    if(document.getElementById('vegas-itinerary')) document.getElementById('vegas-itinerary').innerHTML = hVegas || '<div class="empty-state">No activities</div>';
    if(document.getElementById('today-itinerary')) document.getElementById('today-itinerary').innerHTML = hToday || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">Nothing Scheduled</div></div>';
    if(document.getElementById('tomorrow-itinerary')) document.getElementById('tomorrow-itinerary').innerHTML = hTomorrow || '<div class="empty-state"><span class="empty-icon">📅</span><div class="empty-text">No Plans Yet</div></div>';
    
    safeRun('RenderAcc', renderAccommodations);
}

function updateFamilyFilter() { safeRun('UpdateFilter', () => {
    const sel = document.getElementById('family-selector');
    if(sel) { localStorage.setItem('savedFamilyFilter', sel.value); renderItinerary(); }
})};

// ==========================================
// 5. WEATHER ENGINE (With Fallback)
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (c) => { 
    const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
    return m[c] || '🌤️'; 
};

async function fetchAndRenderWeather(lat, lon, fallbackName = null) {
    try { 
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${W_API_KEY}&units=metric`); 
        if(!res.ok) throw new Error("API Error");
        const d = await res.json(); 
        
        const locName = fallbackName || d.name;
        if(document.getElementById('hw-icon')) document.getElementById('hw-icon').innerText = getWeatherIcon(d.weather[0].icon); 
        if(document.getElementById('hw-temp')) document.getElementById('hw-temp').innerText = `${Math.round(d.main.temp)}°C`; 
        if(document.getElementById('hw-desc')) document.getElementById('hw-desc').innerText = d.weather[0].description; 
        if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = `📍 ${locName}`;
        
        const mainWeather = d.weather[0].main.toLowerCase();
        let bgImage = 'bg.jpg'; 
        if (mainWeather.includes('clear')) bgImage = 'clear.jpg';
        else if (mainWeather.includes('cloud')) bgImage = 'clouds.jpg';
        else if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) bgImage = 'rain.jpg';
        else if (mainWeather.includes('snow')) bgImage = 'snow.jpg';
        document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`);

        const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${W_API_KEY}&units=metric`); 
        const fData = await fRes.json();
        let forecastHtml = fData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
            const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
            return `<div class="WTH-card"><span class="WTH-day">${dayName}</span><span class="WTH-icon">${getWeatherIcon(day.weather[0].icon)}</span><span class="WTH-temps">${Math.round(day.main.temp)}°C</span></div>`; 
        }).join('');
        
        const wDash = document.getElementById('WTH-dashboard');
        if (wDash) wDash.innerHTML = `
            <div class="WTH-hero" style="backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 2px solid var(--accent);">
                <div class="WTH-icon" style="font-size: 60px;">${getWeatherIcon(d.weather[0].icon)}</div>
                <div class="WTH-hero-temp" style="color: var(--accent);">${Math.round(d.main.temp)}°C</div>
                <div class="WTH-hero-desc">${d.weather[0].description}</div>
                <div style="font-size: 15px; font-weight: 900; color: var(--text); opacity: 0.5; margin-top: 20px; letter-spacing: 1px; text-transform: uppercase;">
                    📍 ${escapeHTML(locName)}
                </div>
            </div>
            <h3 class="ADM-hdr" style="margin: 30px 0 15px;">5-Day Forecast</h3>
            ${forecastHtml}
        `; 
    } catch (e) { 
        console.error("[MODULE ISOLATED] Weather Fetch Failed", e);
        if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 Offline"; 
    }
}

async function initWeather() {
    // Default fallback to Los Angeles if GPS fails or hangs
    const fallbackLat = 34.0522, fallbackLon = -118.2437;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { safeRunAsync('WeatherFetch', () => fetchAndRenderWeather(pos.coords.latitude, pos.coords.longitude)); },
            (err) => { safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles")); },
            { timeout: 5000 } // 5 Second limit before fallback
        );
    } else {
        safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles"));
    }
}

// ==========================================
// 6. INITIALIZATION & PWA
// ==========================================
window.onload = () => {
    safeRun('InitTheme', () => {
        applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
        document.body.classList.remove('theme-la', 'theme-utah', 'theme-vegas', 'theme-flights');
        updateMetaThemeColor('home');
    });
    
    safeRun('InitClocks', () => {
        updateTimeAndCountdown();
        setInterval(updateTimeAndCountdown, 60000); 
    });
    
    safeRun('InitVault', renderTravelVault);
    safeRun('InitWeather', initWeather);
    safeRunAsync('InitCurrency', initLiveCurrency); 
    safeRunAsync('InitItinerary', loadItinerary);
    
    const homeEl = document.getElementById('home');
    if (homeEl) requestAnimationFrame(() => homeEl.classList.add('fade-in'));
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
}

function syncUpdates() {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.update(); });
    }
    alert("Updating..."); window.location.reload(true); 
}
