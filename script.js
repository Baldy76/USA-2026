// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); 
let liveExchangeRate = 1.27; 

// ==========================================
// 1. THEME & UI HELPERS
// ==========================================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    updateMetaThemeColor();
}
window.setThemeMode = (isDark) => { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); };

function updateMetaThemeColor() {
    setTimeout(() => {
        const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        const meta = document.getElementById('theme-meta'); 
        if (meta && accentColor) meta.content = accentColor;
    }, 50); 
}

function showPage(event, pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(pageId).style.display = 'block';
    event.currentTarget.classList.add('active');
    window.scrollTo(0,0);

    // Apply Dynamic City Themes
    document.body.classList.remove('theme-la', 'theme-utah', 'theme-vegas');
    if (pageId === 'la') document.body.classList.add('theme-la');
    else if (pageId === 'utah') document.body.classList.add('theme-utah');
    else if (pageId === 'vegas') document.body.classList.add('theme-vegas');
    
    updateMetaThemeColor();
}

function openWeatherPage() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('weather-root').style.display = 'block';
}

function switchDayView(day) {
    const todayView = document.getElementById('today-view');
    const tomorrowView = document.getElementById('tomorrow-view');
    const btnToday = document.getElementById('btn-show-today');
    const btnTomorrow = document.getElementById('btn-show-tomorrow');
    if (day === 'today') {
        todayView.style.display = 'block'; tomorrowView.style.display = 'none';
        btnToday.style.backgroundColor = 'var(--accent)'; btnToday.style.color = 'white';
        btnTomorrow.style.backgroundColor = 'var(--ios-grey)'; btnTomorrow.style.color = 'var(--text)';
    } else {
        todayView.style.display = 'none'; tomorrowView.style.display = 'block';
        btnTomorrow.style.backgroundColor = 'var(--accent)'; btnTomorrow.style.color = 'white';
        btnToday.style.backgroundColor = 'var(--ios-grey)'; btnToday.style.color = 'var(--text)';
    }
}

function toggleComplete(element) {
    if (element.style.opacity === '0.5') {
        element.style.opacity = '1'; element.style.transform = 'scale(1)';
    } else {
        element.style.opacity = '0.5'; element.style.transform = 'scale(0.98)';
    }
}

// 100% BULLETPROOF HTML ESCAPER - Will absolutely never crash JavaScript.
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'); 
};

// ==========================================
// 2. DASHBOARD ENGINES
// ==========================================
let currentTipPercent = 18;

function setTip(percent, btnElement) {
    currentTipPercent = percent;
    document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    calculateTip();
}

function calculateTip() {
    const billTotal = parseFloat(document.getElementById('bill-total').value) || 0;
    const splitWays = parseInt(document.getElementById('split-ways').value) || 1;
    
    const totalWithTip = billTotal * (1 + (currentTipPercent / 100));
    const perFamilyUsd = totalWithTip / splitWays;
    const perFamilyGbp = perFamilyUsd / liveExchangeRate; 
    
    document.getElementById('tip-usd').innerText = `$${perFamilyUsd.toFixed(2)}`;
    document.getElementById('tip-gbp').innerText = `£${perFamilyGbp.toFixed(2)}`;
}

async function initLiveCurrency() {
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
        const data = await response.json();
        if (data.rates && data.rates.USD) {
            liveExchangeRate = data.rates.USD;
            document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate.toFixed(2)}`;
        }
    } catch (error) { 
        document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate}`; 
    }
}

function convertCurrency() {
    const usd = document.getElementById('usd-input').value;
    document.getElementById('gbp-output').innerText = usd ? `£${(usd / liveExchangeRate).toFixed(2)}` : `£0.00`;
}

function updateTimeAndCountdown() {
    const now = new Date();
    const savedStart = localStorage.getItem('tripStartDate');
    const cContainer = document.getElementById('countdown-display');
    const clockContainer = document.getElementById('dual-clocks');
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString(undefined, options);
    
    if (document.getElementById('cd-date')) document.getElementById('cd-date').textContent = dateString;
    if (document.getElementById('clock-date')) document.getElementById('clock-date').textContent = dateString;

    if (savedStart) {
        document.getElementById('trip-start-date').value = savedStart;
        const tripDate = new Date(savedStart);
        tripDate.setHours(0,0,0,0);
        const diff = tripDate - now;
        
        if (diff > 0) {
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            document.getElementById('cd-text').innerHTML = `🚀 ${days} Days to Go!`;
            cContainer.style.display = 'block'; 
            clockContainer.style.display = 'none';
            return; 
        }
    } 
    
    cContainer.style.display = 'none'; 
    clockContainer.style.display = 'block';
    
    const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
    const ptTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(now);
    
    document.getElementById('clock-uk').innerText = ukTime;
    document.getElementById('clock-local').innerText = ptTime;
}

function saveTripSettings() { 
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
    updateTimeAndCountdown(); 
}

function saveTravelVault() {
    const flight = {
        dep: document.getElementById('vault-dep').value.trim(),
        arr: document.getElementById('vault-arr').value.trim(),
        airline: document.getElementById('vault-airline').value.trim().toUpperCase(),
        fnum: document.getElementById('vault-fnum').value.trim(),
        term: document.getElementById('vault-term').value.trim(),
        ref: document.getElementById('vault-ref').value.trim()
    };
    const car = document.getElementById('vault-car').value;
    
    localStorage.setItem('travelVault', JSON.stringify({flight, car}));
    
    const msg = document.getElementById('vault-save-msg');
    msg.style.display = 'block'; 
    setTimeout(() => msg.style.display = 'none', 2500);
    renderTravelVault();
}

function renderTravelVault() {
    const vault = JSON.parse(localStorage.getItem('travelVault')) || null;
    const display = document.getElementById('today-vault-display');
    
    if (vault) {
        let f = vault.flight;
        if (typeof f === 'string' || !f) f = { dep:'', arr:'', airline:'', fnum:'', term:'', ref:'' };

        document.getElementById('vault-dep').value = f.dep || '';
        document.getElementById('vault-arr').value = f.arr || '';
        document.getElementById('vault-airline').value = f.airline || '';
        document.getElementById('vault-fnum').value = f.fnum || '';
        document.getElementById('vault-term').value = f.term || '';
        document.getElementById('vault-ref').value = f.ref || '';
        document.getElementById('vault-car').value = vault.car || '';

        let flightHtml = "";
        
        if (f.dep || f.arr || f.fnum) {
            const searchStr = (f.airline + f.fnum).replace(/\s+/g, '');
            const trackerLink = searchStr ? `https://flightaware.com/live/flight/${searchStr}` : '#';
            const linkHtml = searchStr ? `<a href="${escapeHTML(trackerLink)}" target="_blank" class="flight-tracker-link">${escapeHTML(f.airline)} ${escapeHTML(f.fnum)} ↗</a>` : `${escapeHTML(f.airline)} ${escapeHTML(f.fnum)}`;

            flightHtml = `
            <div class="flight-card">
                <div class="flight-header">
                    <span class="flight-num">${linkHtml}</span>
                    <span style="font-size:12px; font-weight:800; opacity:0.8;">REF: ${escapeHTML(f.ref)}</span>
                </div>
                <div class="flight-path">
                    <div class="path-node"><span>From</span><strong>${escapeHTML(f.dep)}</strong></div>
                    <div class="plane-icon"></div>
                    <div class="path-node"><span>To</span><strong>${escapeHTML(f.arr)}</strong></div>
                </div>
                <div style="margin-top:15px; display:flex; justify-content: space-between; align-items:center; font-size:13px; font-weight:700; opacity:0.9;">
                    <span>Terminal/Gate: ${escapeHTML(f.term) || "Check Screens"}</span>
                </div>
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
    }
}

// ==========================================
// 3. FETCH AND FILTER DATA
// ==========================================
async function loadItinerary() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split('\n').slice(1); 
        let rawData = rows.filter(row => row.trim() !== ''); 
        
        function parseDateTime(dateStr, timeStr) {
            dateStr = dateStr ? dateStr.trim() : '';
            timeStr = timeStr ? timeStr.trim() : '';
            let d = new Date(`${dateStr} ${timeStr}`);
            if (isNaN(d)) {
                const parts = dateStr.split(/[-/]/);
                if (parts.length === 3) d = new Date(`${parts[2]}/${parts[1]}/${parts[0]} ${timeStr}`);
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
        
        populateDropdown();
        renderItinerary();
    } catch (e) { 
        console.error(e); 
    }
}

function populateDropdown() {
    const mainSelect = document.getElementById('family-selector');
    const accSelect = document.getElementById('acc-family'); 
    
    mainSelect.innerHTML = '<option value="All">Show All Activities</option>';
    if (accSelect) accSelect.innerHTML = '';
    
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);
    
    allFamilies.forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f;
        mainSelect.appendChild(opt);
        if (accSelect) accSelect.appendChild(opt.cloneNode(true));
    });
    
    const savedFamily = localStorage.getItem('savedFamilyFilter');
    if (savedFamily) mainSelect.value = savedFamily;
}

function addCustomFamily() {
    const name = document.getElementById('new-family-name').value.trim();
    if (name) {
        let custom = JSON.parse(localStorage.getItem('customFamilies')) || [];
        if (!custom.includes(name)) {
            custom.push(name);
            localStorage.setItem('customFamilies', JSON.stringify(custom));
            populateDropdown();
            document.getElementById('family-selector').value = name;
            updateFamilyFilter();
        }
        document.getElementById('new-family-name').value = ''; 
    }
}

// ==========================================
// 4. ACCOMMODATION & ITINERARY LOGIC
// ==========================================
function saveAccommodation() {
    const city = document.getElementById('acc-city').value;
    const family = document.getElementById('acc-family').value;
    const address = document.getElementById('acc-address').value.trim();
    const start = document.getElementById('acc-start').value;
    const end = document.getElementById('acc-end').value;
    const link = document.getElementById('acc-link').value.trim();
    const image = document.getElementById('acc-image').value.trim();
    
    if (!family || !address || !start || !end) { alert("Missing details!"); return; }
    
    let accData = JSON.parse(localStorage.getItem('accommodations')) || {};
    if (!accData[city]) accData[city] = {};
    
    accData[city][family] = { address, start, end, link, image };
    localStorage.setItem('accommodations', JSON.stringify(accData));
    
    document.getElementById('acc-address').value = ''; document.getElementById('acc-start').value = '';
    document.getElementById('acc-end').value = ''; document.getElementById('acc-link').value = ''; 
    document.getElementById('acc-image').value = '';
    
    renderAccommodations();
}

function renderAccommodations() {
    const filter = document.getElementById('family-selector').value;
    const data = JSON.parse(localStorage.getItem('accommodations')) || {};
    const cities = [{ id: 'la', key: 'LA' }, { id: 'utah', key: 'Utah' }, { id: 'vegas', key: 'Vegas' }];
    
    const today = new Date(); 
    today.setHours(0,0,0,0);
    
    let todayHtml = '';

    cities.forEach(c => {
        const container = document.getElementById(`${c.id}-home-card`);
        if (!container) return;
        
        let cHtml = '';
        const cityData = data[c.key] || {};
        
        const processCard = (f, acc) => {
            const address = acc.address || acc;
            const headerBg = acc.image ? `url('${acc.image}') center/cover` : `var(--accent)`;
            // PERFECTED: Using the official Google Maps Directions API URL
            const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
            
            const ui = `
                <div style="background: var(--card); border-radius: 28px; overflow: hidden; box-shadow: 0 8px 24px var(--shadow); margin-bottom: 24px; text-align: left;">
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
                const sDate = new Date(acc.start);
                const eDate = new Date(acc.end);
                sDate.setHours(0,0,0,0);
                eDate.setHours(23,59,59,999);
                if (today >= sDate && today <= eDate) {
                    todayHtml += ui;
                }
            }
        };

        if (filter !== 'All' && cityData[filter]) {
            processCard(filter, cityData[filter]);
        } else if (filter === 'All') {
            Object.entries(cityData).forEach(([f, acc]) => processCard(f, acc));
        }
        
        container.innerHTML = cHtml;
    });
    
    const todayCard = document.getElementById('today-home-card');
    if (todayCard) todayCard.innerHTML = todayHtml;
}

function renderItinerary() {
    const filter = document.getElementById('family-selector').value;
    
    let hLA = '', hUtah = '', hVegas = '', hToday = '', hTomorrow = '';
    let lLA = '', lUtah = '', lVegas = '';
    let tCount = 0, tmCount = 0;
    
    const today = new Date(); 
    const tomorrow = new Date(); 
    tomorrow.setDate(tomorrow.getDate() + 1); 
    
    itineraryData.forEach(row => {
        const col = row.split(','); 
        if(col.length >= 5) {
            const d = col[0].trim(); const loc = col[1].trim(); const act = col[2].trim();
            const time = col[3].trim(); const who = col[4].trim(); 
            const addr = (col.length >= 6) ? col[5].trim() : '';
            
            if (filter === 'All' || who.toLowerCase() === filter.toLowerCase() || who.toLowerCase() === 'everyone') {
                
                const searchLoc = addr !== '' ? addr : `${act} ${loc}`;
                // PERFECTED: Using the official Google Maps Directions API URL
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

                if (loc.toLowerCase().includes('la') || loc.toLowerCase().includes('los angeles')) {
                    if(d !== lLA) { hLA += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lLA = d; }
                    hLA += cardHtml;
                } else if (loc.toLowerCase().includes('utah')) {
                    if(d !== lUtah) { hUtah += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lUtah = d; }
                    hUtah += cardHtml;
                } else if (loc.toLowerCase().includes('vegas')) {
                    if(d !== lVegas) { hVegas += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lVegas = d; }
                    hVegas += cardHtml;
                }
                
                const isDateMatch = (s, target) => { 
                    let dt = new Date(s); 
                    if(isNaN(dt)) { 
                        const p = s.split(/[-/]/); 
                        dt = new Date(`${p[2]}-${p[1]}-${p[0]}`); 
                    } 
                    return dt.toDateString() === target.toDateString(); 
                };
                
                if (isDateMatch(d, today)) { hToday += cardHtml; tCount++; } 
                else if (isDateMatch(d, tomorrow)) { hTomorrow += cardHtml; tmCount++; }
            }
        }
    });
    
    document.getElementById('la-itinerary').innerHTML = hLA || '<div class="empty-state">No activities listed</div>';
    document.getElementById('utah-itinerary').innerHTML = hUtah || '<div class="empty-state">No activities listed</div>';
    document.getElementById('vegas-itinerary').innerHTML = hVegas || '<div class="empty-state">No activities listed</div>';
    document.getElementById('today-itinerary').innerHTML = hToday || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">Nothing Scheduled</div></div>';
    document.getElementById('tomorrow-itinerary').innerHTML = hTomorrow || '<div class="empty-state"><span class="empty-icon">📅</span><div class="empty-text">No Plans Yet</div></div>';
    
    renderAccommodations();
}

function updateFamilyFilter() { 
    localStorage.setItem('savedFamilyFilter', document.getElementById('family-selector').value); 
    renderItinerary(); 
}

// ==========================================
// 5. WEATHER ENGINE & INIT
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (c) => { 
    const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
    return m[c] || '🌤️'; 
};

async function initWeather() { 
    const wDash = document.getElementById('WTH-dashboard');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => { 
            try { 
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                const d = await res.json(); 
                
                document.getElementById('hw-icon').innerText = getWeatherIcon(d.weather[0].icon); 
                document.getElementById('hw-temp').innerText = `${Math.round(d.main.temp)}°C`; 
                document.getElementById('hw-desc').innerText = d.weather[0].description; 
                document.getElementById('hw-loc').innerText = `📍 ${d.name}`;
                
                // Dynamic Weather Backgrounds
                const mainWeather = d.weather[0].main.toLowerCase();
                let bgImage = 'bg.jpg'; 
                if (mainWeather.includes('clear')) bgImage = 'clear.jpg';
                else if (mainWeather.includes('cloud')) bgImage = 'clouds.jpg';
                else if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) bgImage = 'rain.jpg';
                else if (mainWeather.includes('snow')) bgImage = 'snow.jpg';
                
                document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`);

                const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                const fData = await fRes.json();
                
                let forecastHtml = fData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
                    const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
                    return `<div class="WTH-card"><span class="WTH-day">${dayName}</span><span class="WTH-icon">${getWeatherIcon(day.weather[0].icon)}</span><span class="WTH-temps">${Math.round(day.main.temp)}°C</span></div>`; 
                }).join('');
                
                if (wDash) wDash.innerHTML = `
                    <div class="WTH-hero" style="backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);">
                        <div class="WTH-icon" style="font-size: 60px;">${getWeatherIcon(d.weather[0].icon)}</div>
                        <div class="WTH-hero-temp">${Math.round(d.main.temp)}°C</div>
                        <div class="WTH-hero-desc">${d.weather[0].description}</div>
                        <div style="font-size: 15px; font-weight: 900; color: var(--text); opacity: 0.5; margin-top: 20px; letter-spacing: 1px; text-transform: uppercase;">
                            📍 ${escapeHTML(d.name)}
                        </div>
                    </div>
                    <h3 class="ADM-hdr" style="margin: 30px 0 15px;">5-Day Forecast</h3>
                    ${forecastHtml}
                `; 
            } catch (e) { 
                if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 Offline"; 
            } 
        }, () => { 
            if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 GPS Denied"; 
        });
    }
}

// ==========================================
// 6. APP INITIALIZATION 
// ==========================================
window.onload = () => {
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
    updateTimeAndCountdown();
    setInterval(updateTimeAndCountdown, 60000); 
    renderTravelVault();
    initWeather();
    initLiveCurrency(); 
    loadItinerary();
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW Ready'));
}

function syncUpdates() {
    navigator.serviceWorker.getRegistrations().then(regs => { 
        for (let r of regs) r.update(); 
    });
    alert("Updating..."); 
    window.location.reload(true); 
}
