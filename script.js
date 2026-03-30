// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); 
let liveExchangeRate = 1.27; // Default fallback (Dollars per Pound)

// ==========================================
// 1. THEME LOGIC
// ==========================================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const meta = document.getElementById('theme-meta'); 
    if(meta) meta.content = isDark ? "#000000" : "#f0f2f5";
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
}
window.setThemeMode = (isDark) => { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); };

// ==========================================
// 2. NAVIGATION & UI LOGIC
// ==========================================
function showPage(event, pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).style.display = 'block';
    event.currentTarget.classList.add('active');
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

// UPDATED: Live Currency Engine (Dollars per Pound)
async function initLiveCurrency() {
    try {
        // Fetching GBP to USD rate
        const response = await fetch('https://api.frankfurter.app/latest?from=GBP&to=USD');
        const data = await response.json();
        if (data.rates && data.rates.USD) {
            liveExchangeRate = data.rates.USD;
            document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate.toFixed(2)}`;
            console.log("Live exchange rate updated:", liveExchangeRate);
        }
    } catch (error) {
        console.warn("Could not fetch live rate, using fallback.");
        document.getElementById('live-rate-tag').innerText = `RATE: £1 = $${liveExchangeRate}`;
    }
}

function convertCurrency() {
    const usd = document.getElementById('usd-input').value;
    // Since rate is USD per GBP, to get GBP we divide: USD / (USD/GBP) = GBP
    document.getElementById('gbp-output').innerText = usd ? `£${(usd / liveExchangeRate).toFixed(2)}` : `£0.00`;
}

function updateTimeAndCountdown() {
    const now = new Date();
    const savedStart = localStorage.getItem('tripStartDate');
    const cContainer = document.getElementById('countdown-display');
    const clockContainer = document.getElementById('dual-clocks');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString(undefined, options);
    
    document.getElementById('cd-date').textContent = dateString;
    document.getElementById('clock-date').textContent = dateString;

    if(savedStart) {
        document.getElementById('trip-start-date').value = savedStart;
        const tripDate = new Date(savedStart);
        tripDate.setHours(0,0,0,0);
        const diff = tripDate - now;
        if (diff > 0) {
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            document.getElementById('cd-text').innerHTML = `🚀 ${days} Days until Takeoff!`;
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

function saveTripSettings() {
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value);
    updateTimeAndCountdown();
}

function saveTravelVault() {
    const flight = document.getElementById('vault-flight').value;
    const car = document.getElementById('vault-car').value;
    localStorage.setItem('travelVault', JSON.stringify({flight, car}));
    const msg = document.getElementById('vault-save-msg');
    msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500);
    renderTravelVault();
}

function renderTravelVault() {
    const vault = JSON.parse(localStorage.getItem('travelVault')) || null;
    const display = document.getElementById('today-vault-display');
    if(vault && (vault.flight || vault.car)) {
        display.innerHTML = `
            <div class="admin-card" style="margin-bottom: 24px;">
                <h3 style="margin-bottom: 15px;">🧳 The Travel Vault</h3>
                ${vault.flight ? `<div style="font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase; margin-bottom:5px;">✈️ Flights</div><div style="font-size: 16px; font-weight: 700; margin-bottom: 15px; white-space: pre-wrap;">${escapeHTML(vault.flight)}</div>` : ''}
                ${vault.car ? `<div style="font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase; margin-bottom:5px;">🚗 Rental Car</div><div style="font-size: 16px; font-weight: 700; white-space: pre-wrap;">${escapeHTML(vault.car)}</div>` : ''}
            </div>`;
    } else { display.innerHTML = ''; }
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
            const colsA = a.split(','); const colsB = b.split(',');
            if (colsA.length < 5 || colsB.length < 5) return 0;
            return parseDateTime(colsA[0], colsA[3]) - parseDateTime(colsB[0], colsB[3]);
        });

        itineraryData = rawData;
        itineraryData.forEach(row => {
            const columns = row.split(',');
            if(columns.length >= 5) {
                const who = columns[4].trim();
                if(who.toLowerCase() !== 'everyone') sheetFamilies.add(who);
            }
        });
        populateDropdown();
        renderItinerary();
    } catch (error) { console.error("Error loading data:", error); }
}

function populateDropdown() {
    const mainSelect = document.getElementById('family-selector');
    const accSelect = document.getElementById('acc-family'); 
    mainSelect.innerHTML = '<option value="All">Show All Activities</option>';
    if (accSelect) accSelect.innerHTML = '';
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);
    allFamilies.forEach(family => {
        const opt = document.createElement('option'); opt.value = family; opt.textContent = family;
        mainSelect.appendChild(opt);
        if (accSelect) { const opt2 = opt.cloneNode(true); accSelect.appendChild(opt2); }
    });
    const savedFamily = localStorage.getItem('savedFamilyFilter');
    if (savedFamily) mainSelect.value = savedFamily;
}

function addCustomFamily() {
    const input = document.getElementById('new-family-name');
    const newName = input.value.trim();
    if (newName) {
        let customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
        if (!customFamilies.includes(newName)) {
            customFamilies.push(newName);
            localStorage.setItem('customFamilies', JSON.stringify(customFamilies));
            populateDropdown();
            document.getElementById('family-selector').value = newName;
            updateFamilyFilter();
        }
        input.value = ''; 
    }
}

// ==========================================
// 4. ACCOMMODATION LOGIC
// ==========================================
function saveAccommodation() {
    const city = document.getElementById('acc-city').value;
    const family = document.getElementById('acc-family').value;
    const address = document.getElementById('acc-address').value.trim();
    const start = document.getElementById('acc-start').value;
    const end = document.getElementById('acc-end').value;
    const link = document.getElementById('acc-link').value.trim();
    const image = document.getElementById('acc-image').value.trim();
    if(!family || !address || !start || !end) { alert("Missing details!"); return; }
    let accData = JSON.parse(localStorage.getItem('accommodations')) || {};
    if(!accData[city]) accData[city] = {};
    accData[city][family] = { address, start, end, link, image };
    localStorage.setItem('accommodations', JSON.stringify(accData));
    document.getElementById('acc-address').value = ''; renderAccommodations();
}

function createAccCardHTML(fam, cityKey, acc) {
    const address = acc.address || acc;
    const headerBg = acc.image ? `url('${acc.image}') center/cover` : `var(--accent)`;
    const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    return `
        <div style="background: var(--card); border-radius: 28px; overflow: hidden; box-shadow: 0 8px 24px var(--shadow); margin-bottom: 24px; text-align: left;">
            <div style="height: 140px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${fam} Stay</h3>
            </div>
            <div style="padding: 20px;">
                <div style="font-size: 14px; opacity: 0.6; font-weight: 700; margin-bottom: 15px;">📍 ${address}</div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.open('${mapLink}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px;">🚗 Drive</button>
                    ${acc.link ? `<button onclick="window.open('${acc.link}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>` : ''}
                </div>
            </div>
        </div>`;
}

function renderAccommodations() {
    const selectedFamily = document.getElementById('family-selector').value;
    const accData = JSON.parse(localStorage.getItem('accommodations')) || {};
    const cities = [{ id: 'la', key: 'LA' }, { id: 'utah', key: 'Utah' }, { id: 'vegas', key: 'Vegas' }];
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    let todayHtml = '';

    cities.forEach(cityObj => {
        const container = document.getElementById(`${cityObj.id}-home-card`);
        if(!container) return;
        let cityHtml = '';
        const cityData = accData[cityObj.key] || {};
        if (selectedFamily !== 'All' && cityData[selectedFamily]) {
            const acc = cityData[selectedFamily];
            cityHtml = createAccCardHTML(selectedFamily, cityObj.key, acc);
            const start = new Date(acc.start); const end = new Date(acc.end);
            if (todayDate >= start && todayDate <= end) todayHtml += cityHtml;
        } else if (selectedFamily === 'All') {
            for (const [fam, acc] of Object.entries(cityData)) {
                const html = createAccCardHTML(fam, cityObj.key, acc);
                cityHtml += html;
                const start = new Date(acc.start); const end = new Date(acc.end);
                if (todayDate >= start && todayDate <= end) todayHtml += html;
            }
        }
        container.innerHTML = cityHtml;
    });
    document.getElementById('today-home-card').innerHTML = todayHtml;
}

function renderItinerary() {
    const selectedFamily = document.getElementById('family-selector').value;
    let htmlLA = '', htmlUtah = '', htmlVegas = '', htmlToday = '', htmlTomorrow = '';
    let lastDateLA = '', lastDateUtah = '', lastDateVegas = '';
    let todayCount = 0, tomorrowCount = 0;
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); 
    
    function isSameDay(dateStr, targetDate) {
        let d = new Date(dateStr);
        if (isNaN(d)) {
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); 
        }
        return !isNaN(d) && d.toDateString() === targetDate.toDateString();
    }
    
    itineraryData.forEach(row => {
        const columns = row.split(','); 
        if(columns.length >= 5) {
            const date = columns[0].trim(); const location = columns[1].trim(); const activity = columns[2].trim();
            const time = columns[3].trim(); const who = columns[4].trim(); 
            const address = (columns.length >= 6 && columns[5].trim() !== '') ? columns[5].trim() : '';
            
            if (selectedFamily === 'All' || who.toLowerCase() === selectedFamily.toLowerCase() || who.toLowerCase() === 'everyone') {
                const searchLocation = address !== '' ? address : `${activity} ${location}`;
                const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchLocation)}`;
                const cardHtml = `
                    <div class="skel-card" style="text-align: left; transition: all 0.3s ease; cursor: pointer;" onclick="toggleComplete(this)">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 12px; margin-bottom: 12px;">
                            <strong style="font-size: 16px; font-weight: 800;">${time}</strong>
                            <span style="background: var(--ios-grey); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; color: var(--text);">${who}</span>
                        </div>
                        <div style="font-size: 18px; font-weight: 900; line-height: 1.4; margin-bottom: 8px;">${activity}</div>
                        <div style="font-size: 14px; font-weight: 700; opacity: 0.6; line-height: 1.6;">
                            📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;" onclick="event.stopPropagation()">Get Directions</a>
                            ${address ? `<br>🗺️ ${address}` : ''}
                        </div>
                    </div>`;

                if (location.toLowerCase().includes('la') || location.toLowerCase().includes('los angeles')) {
                    if(date !== lastDateLA) { htmlLA += `<div class="date-divider"><span class="sticky-date">${date}</span></div>`; lastDateLA = date; }
                    htmlLA += cardHtml;
                } else if (location.toLowerCase().includes('utah')) {
                    if(date !== lastDateUtah) { htmlUtah += `<div class="date-divider"><span class="sticky-date">${date}</span></div>`; lastDateUtah = date; }
                    htmlUtah += cardHtml;
                } else if (location.toLowerCase().includes('vegas')) {
                    if(date !== lastDateVegas) { htmlVegas += `<div class="date-divider"><span class="sticky-date">${date}</span></div>`; lastDateVegas = date; }
                    htmlVegas += cardHtml;
                }
                if (isSameDay(date, today)) { htmlToday += cardHtml; todayCount++; } 
                else if (isSameDay(date, tomorrow)) { htmlTomorrow += cardHtml; tomorrowCount++; }
            }
        }
    });
    
    document.getElementById('la-itinerary').innerHTML = htmlLA || '<div class="empty-state">No activities listed</div>';
    document.getElementById('utah-itinerary').innerHTML = htmlUtah || '<div class="empty-state">No activities listed</div>';
    document.getElementById('vegas-itinerary').innerHTML = htmlVegas || '<div class="empty-state">No activities listed</div>';
    document.getElementById('today-itinerary').innerHTML = htmlToday || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">Nothing Scheduled</div></div>';
    document.getElementById('tomorrow-itinerary').innerHTML = htmlTomorrow || '<div class="empty-state"><span class="empty-icon">📅</span><div class="empty-text">No Plans Yet</div></div>';
    renderAccommodations();
}

function updateFamilyFilter() { localStorage.setItem('savedFamilyFilter', document.getElementById('family-selector').value); renderItinerary(); }

// ==========================================
// 5. WEATHER ENGINE 
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (code) => { 
    const map = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
    return map[code] || '🌤️'; 
};
// SECURE HTML ESCAPE
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); 
};

async function initWeather() { 
    const wDash = document.getElementById('WTH-dashboard');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => { 
            try { 
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                const data = await res.json(); 
                const temp = `${Math.round(data.main.temp)}°C`; 
                const icon = getWeatherIcon(data.weather[0].icon); 
                document.getElementById('hw-icon').innerText = icon; document.getElementById('hw-temp').innerText = temp; 
                document.getElementById('hw-desc').innerText = data.weather[0].description; document.getElementById('hw-loc').innerText = `📍 ${data.name}`;
                const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                const fData = await fRes.json();
                let forecastHtml = fData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
                    const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
                    return `<div class="WTH-card"><span class="WTH-day">${dayName}</span><span class="WTH-icon">${getWeatherIcon(day.weather[0].icon)}</span><span class="WTH-temps">${Math.round(day.main.temp)}°C</span></div>`; 
                }).join('');
                if(wDash) wDash.innerHTML = `<div class="WTH-hero"><div class="WTH-icon" style="font-size: 60px;">${icon}</div><div class="WTH-hero-temp">${temp}</div><div class="WTH-hero-desc">${data.weather[0].description}</div><div style="font-size: 15px; font-weight: 900; color: var(--text); opacity: 0.5; margin-top: 20px; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(data.name)}</div></div><h3 class="ADM-hdr" style="margin: 30px 0 15px;">5-Day Forecast</h3>${forecastHtml}`; 
            } catch (e) { if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 Offline"; } 
        }, () => { if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 GPS Denied"; });
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
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('Registered')).catch(err => console.error(err));
    });
}

function syncUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.update(); });
        alert("Syncing! Reloading now..."); window.location.reload(true); 
    } else { window.location.reload(true); }
}
