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
    const meta = document.getElementById('theme-meta'); 
    if(meta) meta.content = isDark ? "#0b0e14" : "#f2f2f7";
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
}
window.setThemeMode = (isDark) => { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); };

function showPage(event, pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).style.display = 'block';
    event.currentTarget.classList.add('active');
    window.scrollTo(0,0);
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
    element.style.opacity = (element.style.opacity === '0.5') ? '1' : '0.5';
    element.style.transform = (element.style.opacity === '0.5') ? 'scale(0.98)' : 'scale(1)';
}

// ==========================================
// 2. DASHBOARD ENGINES
// ==========================================
async function initLiveCurrency() {
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
        const data = await response.json();
        if (data.rates && data.rates.USD) {
            liveExchangeRate = data.rates.USD;
            document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate.toFixed(2)}`;
        }
    } catch (error) { document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate}`; }
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

    if(savedStart) {
        document.getElementById('trip-start-date').value = savedStart;
        const tripDate = new Date(savedStart);
        tripDate.setHours(0,0,0,0);
        const diff = tripDate - now;
        if (diff > 0) {
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            document.getElementById('cd-text').innerHTML = `🚀 ${days} Days to Go!`;
            cContainer.style.display = 'block'; clockContainer.style.display = 'none';
            return; 
        }
    } 
    cContainer.style.display = 'none'; clockContainer.style.display = 'block';
    const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
    const ptTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(now);
    document.getElementById('clock-uk').innerText = ukTime;
    document.getElementById('clock-local').innerText = ptTime;
}

function saveTripSettings() { localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); updateTimeAndCountdown(); }

function saveTravelVault() {
    localStorage.setItem('travelVault', JSON.stringify({
        flight: document.getElementById('vault-flight').value,
        car: document.getElementById('vault-car').value
    }));
    renderTravelVault();
}

function renderTravelVault() {
    const vault = JSON.parse(localStorage.getItem('travelVault')) || null;
    const display = document.getElementById('today-vault-display');
    if(vault && (vault.flight || vault.car)) {
        document.getElementById('vault-flight').value = vault.flight || '';
        document.getElementById('vault-car').value = vault.car || '';

        // Parsing Flight String: LHR | LAX | BA269 | Terminal 5
        const fParts = (vault.flight || "").split('|').map(s => s.trim());
        let flightHtml = "";
        if(fParts.length >= 3) {
            flightHtml = `
            <div class="flight-card">
                <div class="flight-header">
                    <span class="flight-num">FLIGHT ${fParts[2]}</span>
                    <span style="font-size:12px; font-weight:800; opacity:0.8;">BOARDING PASS</span>
                </div>
                <div class="flight-path">
                    <div class="path-node"><span>From</span><strong>${fParts[0]}</strong></div>
                    <div class="plane-icon"></div>
                    <div class="path-node"><span>To</span><strong>${fParts[1]}</strong></div>
                </div>
                <div style="margin-top:15px; font-size:13px; font-weight:700; opacity:0.9; text-align:center;">
                    ${fParts[3] || "Check terminal for gate info"}
                </div>
            </div>`;
        }

        display.innerHTML = `
            ${flightHtml}
            ${vault.car ? `<div class="admin-card" style="margin-bottom:24px; border-left: 5px solid var(--accent);">
                <div style="font-size:11px; font-weight:800; opacity:0.5; text-transform:uppercase;">🚗 Rental Reference</div>
                <div style="font-size:16px; font-weight:700; margin-top:5px;">${escapeHTML(vault.car)}</div>
            </div>` : ''}
        `;
    } else { display.innerHTML = ''; }
}

// ==========================================
// 3. CORE LOGIC (Load, Render, Sort)
// ==========================================
async function loadItinerary() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const rows = data.split('\n').slice(1); 
        let rawData = rows.filter(row => row.trim() !== ''); 
        
        function parseDT(dStr, tStr) {
            dStr = dStr ? dStr.trim() : ''; tStr = tStr ? tStr.trim() : '';
            let d = new Date(`${dStr} ${tStr}`);
            if (isNaN(d)) {
                const p = dStr.split(/[-/]/);
                if (p.length === 3) d = new Date(`${p[2]}/${p[1]}/${p[0]} ${tStr}`);
            }
            return isNaN(d) ? 0 : d.getTime();
        }

        rawData.sort((a, b) => {
            const ca = a.split(','); const cb = b.split(',');
            return parseDT(ca[0], ca[3]) - parseDT(cb[0], cb[3]);
        });

        itineraryData = rawData;
        itineraryData.forEach(row => {
            const col = row.split(',');
            if(col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') sheetFamilies.add(col[4].trim());
        });
        populateDropdown();
        renderItinerary();
    } catch (e) { console.error(e); }
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
    if (localStorage.getItem('savedFamilyFilter')) mainSelect.value = localStorage.getItem('savedFamilyFilter');
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

function saveAccommodation() {
    const city = document.getElementById('acc-city').value;
    const family = document.getElementById('acc-family').value;
    const address = document.getElementById('acc-address').value.trim();
    const start = document.getElementById('acc-start').value;
    const end = document.getElementById('acc-end').value;
    if(!family || !address || !start || !end) return;
    let data = JSON.parse(localStorage.getItem('accommodations')) || {};
    if(!data[city]) data[city] = {};
    data[city][family] = { address, start, end };
    localStorage.setItem('accommodations', JSON.stringify(data));
    renderAccommodations();
}

function renderAccommodations() {
    const filter = document.getElementById('family-selector').value;
    const data = JSON.parse(localStorage.getItem('accommodations')) || {};
    const cities = [{ id: 'la', key: 'LA' }, { id: 'utah', key: 'Utah' }, { id: 'vegas', key: 'Vegas' }];
    const today = new Date(); today.setHours(0,0,0,0);
    let todayHtml = '';

    cities.forEach(c => {
        const container = document.getElementById(`${c.id}-home-card`);
        if(!container) return;
        let cHtml = '';
        const cityData = data[c.key] || {};
        const process = (f, acc) => {
            const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(acc.address)}`;
            const ui = `<div class="admin-card" style="border-left:5px solid var(--accent); margin-bottom:20px;">
                <div style="font-size:11px; font-weight:800; opacity:0.5; text-transform:uppercase;">🏡 ${f} Stay (${c.key})</div>
                <div style="font-size:15px; font-weight:700; margin: 5px 0 12px;">${acc.address}</div>
                <button onclick="window.open('${mapLink}', '_blank')" class="action-btn" style="padding:10px; font-size:14px;">🚗 Drive Home</button>
            </div>`;
            cHtml += ui;
            if(today >= new Date(acc.start) && today <= new Date(acc.end)) todayHtml += ui;
        };

        if (filter !== 'All' && cityData[filter]) process(filter, cityData[filter]);
        else if (filter === 'All') Object.entries(cityData).forEach(([f, acc]) => process(f, acc));
        container.innerHTML = cHtml;
    });
    document.getElementById('today-home-card').innerHTML = todayHtml;
}

function renderItinerary() {
    const filter = document.getElementById('family-selector').value;
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
                const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || (act + " " + loc))}`;
                const card = `
                    <div class="admin-card" style="text-align: left; transition: all 0.2s;" onclick="toggleComplete(this)">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 8px; margin-bottom: 10px;">
                            <strong style="font-size: 14px;">${time}</strong>
                            <span style="background: var(--ios-grey); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">${who}</span>
                        </div>
                        <div style="font-size: 17px; font-weight: 800; margin-bottom: 5px;">${act}</div>
                        <div style="font-size: 13px; opacity: 0.6; font-weight: 700;">📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration:none;" onclick="event.stopPropagation()">Get Directions</a></div>
                    </div>`;

                if (loc.toLowerCase().includes('la')) { if(d !== lLA) { hLA += `<div class="date-divider"><span class="sticky-date">${d}</span></div>`; lLA = d; } hLA += card; }
                else if (loc.toLowerCase().includes('utah')) { if(d !== lUtah) { hUtah += `<div class="date-divider"><span class="sticky-date">${d}</span></div>`; lUtah = d; } hUtah += card; }
                else if (loc.toLowerCase().includes('vegas')) { if(d !== lVegas) { hVegas += `<div class="date-divider"><span class="sticky-date">${d}</span></div>`; lVegas = d; } hVegas += card; }
                
                const isD = (s, target) => { let dt = new Date(s); if(isNaN(dt)) { const p=s.split(/[-/]/); dt=new Date(`${p[2]}-${p[1]}-${p[0]}`); } return dt.toDateString() === target.toDateString(); };
                if (isD(d, today)) { hToday += card; tCount++; } 
                else if (isD(d, tomorrow)) { hTomorrow += card; tmCount++; }
            }
        }
    });
    
    document.getElementById('la-itinerary').innerHTML = hLA || '<p>No items</p>';
    document.getElementById('utah-itinerary').innerHTML = hUtah || '<p>No items</p>';
    document.getElementById('vegas-itinerary').innerHTML = hVegas || '<p>No items</p>';
    document.getElementById('today-itinerary').innerHTML = hToday || '<p>Free day!</p>';
    document.getElementById('tomorrow-itinerary').innerHTML = hTomorrow || '<p>No plans yet</p>';
    renderAccommodations();
}

function updateFamilyFilter() { localStorage.setItem('savedFamilyFilter', document.getElementById('family-selector').value); renderItinerary(); }

// ==========================================
// 4. WEATHER ENGINE & INIT
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; return m[c] || '🌤️'; };
const escapeHTML = (s) => s ? String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''') : '';

async function initWeather() { 
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => { 
            try { 
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                const d = await res.json(); 
                document.getElementById('hw-icon').innerText = getWeatherIcon(d.weather[0].icon); 
                document.getElementById('hw-temp').innerText = `${Math.round(d.main.temp)}°C`; 
                document.getElementById('hw-desc').innerText = d.weather[0].description; 
                document.getElementById('hw-loc').innerText = `📍 ${d.name}`;
            } catch (e) { console.error(e); } 
        });
    }
}

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
    navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.update(); });
    alert("Updating..."); window.location.reload(true); 
}
