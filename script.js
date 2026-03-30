// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); 

// ==========================================
// 1. THEME LOGIC (Dark/Light Mode)
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

window.setThemeMode = (isDark) => { 
    applyTheme(isDark); 
    localStorage.setItem('HolidayPlanner_Theme', isDark); 
};

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

// NEW: Tap to Complete Activity
function toggleComplete(element) {
    if(element.style.opacity === '0.5') {
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
    } else {
        element.style.opacity = '0.5';
        element.style.transform = 'scale(0.98)';
    }
}

// NEW: Currency Converter
function convertCurrency() {
    const usd = document.getElementById('usd-input').value;
    const rate = 0.79; // Hardcoded static rate for offline reliability
    if(usd) {
        const gbp = (usd * rate).toFixed(2);
        document.getElementById('gbp-output').innerText = `£${gbp}`;
    } else {
        document.getElementById('gbp-output').innerText = `£0.00`;
    }
}

// NEW: Time & Countdown Engine
function updateTimeAndCountdown() {
    const now = new Date();
    const savedStart = localStorage.getItem('tripStartDate');
    const cContainer = document.getElementById('countdown-display');
    const clockContainer = document.getElementById('dual-clocks');

    if(savedStart) {
        document.getElementById('trip-start-date').value = savedStart;
        const tripDate = new Date(savedStart);
        const diff = tripDate - now;

        if (diff > 0) {
            // Future trip: Show Countdown
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            cContainer.innerHTML = `🚀 ${days} Days until Takeoff!`;
            cContainer.style.display = 'block';
            clockContainer.style.display = 'none';
            return; // Skip drawing clocks
        }
    } 

    // Trip has started (or no date set): Show Clocks
    cContainer.style.display = 'none';
    clockContainer.style.display = 'flex';

    const ukTime = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Europe/London' }).format(now);
    // Defaults to Pacific Time for LA/Vegas. 
    const ptTime = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(now);
    
    document.getElementById('clock-uk').innerText = ukTime;
    document.getElementById('clock-local').innerText = ptTime;
}

function saveTripSettings() {
    const date = document.getElementById('trip-start-date').value;
    localStorage.setItem('tripStartDate', date);
    updateTimeAndCountdown();
}

// NEW: Travel Vault
function saveTravelVault() {
    const flight = document.getElementById('vault-flight').value;
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
    
    if(vault && (vault.flight || vault.car)) {
        document.getElementById('vault-flight').value = vault.flight || '';
        document.getElementById('vault-car').value = vault.car || '';

        display.innerHTML = `
            <div class="admin-card" style="margin-bottom: 24px;">
                <h3 style="margin-bottom: 15px;">🧳 The Travel Vault</h3>
                ${vault.flight ? `<div style="font-size: 14px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">✈️ Flights</div><div style="font-size: 16px; font-weight: 700; margin-bottom: 15px; white-space: pre-wrap;">${escapeHTML(vault.flight)}</div>` : ''}
                ${vault.car ? `<div style="font-size: 14px; font-weight: 800; opacity: 0.5; text-transform: uppercase;">🚗 Rental Car</div><div style="font-size: 16px; font-weight: 700; white-space: pre-wrap;">${escapeHTML(vault.car)}</div>` : ''}
            </div>
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
            if (isNaN(d)) {
                d = new Date(dateStr);
                if (isNaN(d)) {
                    const parts = dateStr.split(/[-/]/);
                    if (parts.length === 3) d = new Date(`${parts[2]}/${parts[1]}/${parts[0]}`);
                }
            }
            return isNaN(d) ? 0 : d.getTime();
        }

        rawData.sort((a, b) => {
            const colsA = a.split(',');
            const colsB = b.split(',');
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
        
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('la-itinerary').innerHTML = "Failed to load itinerary.";
    }
}

function populateDropdown() {
    const mainSelect = document.getElementById('family-selector');
    const accSelect = document.getElementById('acc-family'); 
    mainSelect.innerHTML = '<option value="All">Show All Activities</option>';
    if (accSelect) accSelect.innerHTML = '';
    
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);

    allFamilies.forEach(family => {
        const option1 = document.createElement('option');
        option1.value = family; option1.textContent = family;
        mainSelect.appendChild(option1);
        if (accSelect) {
            const option2 = document.createElement('option');
            option2.value = family; option2.textContent = family;
            accSelect.appendChild(option2);
        }
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
// [Accommodation functions remain the same as 1.1.5, slightly compressed for space]
function saveAccommodation() {
    const city = document.getElementById('acc-city').value;
    const family = document.getElementById('acc-family').value;
    const address = document.getElementById('acc-address').value.trim();
    const start = document.getElementById('acc-start').value;
    const end = document.getElementById('acc-end').value;
    const link = document.getElementById('acc-link').value.trim();
    const image = document.getElementById('acc-image').value.trim();

    if(!family || !address || !start || !end) { alert("Please enter family, address, and dates."); return; }

    let accData = JSON.parse(localStorage.getItem('accommodations')) || {};
    if(!accData[city]) accData[city] = {};
    accData[city][family] = { address, start, end, link, image };
    localStorage.setItem('accommodations', JSON.stringify(accData));

    const msg = document.getElementById('acc-save-msg');
    msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2500);
    
    document.getElementById('acc-address').value = ''; document.getElementById('acc-start').value = '';
    document.getElementById('acc-end').value = ''; document.getElementById('acc-link').value = ''; document.getElementById('acc-image').value = '';
    renderAccommodations();
}

function createAccCardHTML(fam, cityKey, acc) {
    const address = typeof acc === 'string' ? acc : acc.address;
    const link = typeof acc === 'string' ? null : acc.link;
    const image = typeof acc === 'string' ? null : acc.image;
    const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    let buttonsHtml = `<button onclick="window.open('${mapLink}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; gap: 6px;">🚗 Drive</button>`;
    if (link) buttonsHtml += `<button onclick="window.open('${link}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text); display: flex; align-items: center; justify-content: center; gap: 6px;">🌐 Listing</button>`;
    const headerBg = image ? `url('${image}') center/cover` : `var(--accent)`;

    return `
        <div style="background: var(--card); border-radius: 28px; overflow: hidden; box-shadow: 0 8px 24px var(--shadow); margin-bottom: 24px; text-align: left;">
            <div style="height: 140px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${fam} Stay</h3>
            </div>
            <div style="padding: 20px;">
                <div style="font-size: 14px; opacity: 0.6; font-weight: 700; margin-bottom: 15px; line-height: 1.4;">📍 ${address}</div>
                <div style="display: flex; gap: 10px;">${buttonsHtml}</div>
            </div>
        </div>
    `;
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
            const start = typeof acc === 'string' ? null : new Date(acc.start);
            const end = typeof acc === 'string' ? null : new Date(acc.end);
            const cardUI = createAccCardHTML(selectedFamily, cityObj.key, acc);
            cityHtml = cardUI;
            if (start && end) {
                start.setHours(0,0,0,0); end.setHours(23,59,59,999);
                if (todayDate >= start && todayDate <= end) todayHtml += cardUI;
            }
        } else if (selectedFamily === 'All') {
            for (const [fam, acc] of Object.entries(cityData)) {
                const start = typeof acc === 'string' ? null : new Date(acc.start);
                const end = typeof acc === 'string' ? null : new Date(acc.end);
                const cardUI = createAccCardHTML(fam, cityObj.key, acc);
                cityHtml += cardUI;
                if (start && end) {
                    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
                    if (todayDate >= start && todayDate <= end) todayHtml += cardUI;
                }
            }
        }
        container.innerHTML = cityHtml;
    });

    const todayContainer = document.getElementById('today-home-card');
    if (todayContainer) todayContainer.innerHTML = todayHtml;
}

function renderItinerary() {
    const selectedFamily = document.getElementById('family-selector').value;
    
    let htmlLA = '', htmlUtah = '', htmlVegas = '', htmlToday = '', htmlTomorrow = '';
    
    // NEW: Tracking variables for Sticky Date Headers
    let lastDateLA = '', lastDateUtah = '', lastDateVegas = '';
    let todayCount = 0, tomorrowCount = 0;
    
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); 
    
    function isSameDay(dateStr, targetDate) {
        let d = new Date(dateStr);
        if (isNaN(d)) {
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); 
        }
        if (!isNaN(d)) return d.toDateString() === targetDate.toDateString();
        return false;
    }
    
    itineraryData.forEach(row => {
        const columns = row.split(','); 
        if(columns.length >= 5) {
            const date = columns[0].trim();
            const location = columns[1].trim();
            const activity = columns[2].trim();
            const time = columns[3].trim();
            const who = columns[4].trim(); 
            const address = (columns.length >= 6 && columns[5].trim() !== '') ? columns[5].trim() : '';
            
            if (selectedFamily === 'All' || who.toLowerCase() === selectedFamily.toLowerCase() || who.toLowerCase() === 'everyone') {
                
                const searchLocation = address !== '' ? address : `${activity} ${location}`;
                const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchLocation)}`;
                const addressDisplayHtml = address ? `<br><span style="font-size: 13px; font-weight: 600; opacity: 0.8; display: inline-block; margin-top: 6px;">🗺️ ${address}</span>` : '';

                // NEW: Added onclick="toggleComplete(this)" for tap-to-complete
                const cardHtml = `
                    <div style="background: var(--card); margin-bottom: 20px; padding: 24px; border-radius: 24px; box-shadow: 0 8px 24px var(--shadow); text-align: left; color: var(--text); transition: all 0.3s ease; cursor: pointer;" onclick="toggleComplete(this)">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 12px; margin-bottom: 12px;">
                            <strong style="font-size: 16px; font-weight: 800;">${time}</strong>
                            <span style="background: var(--ios-grey); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; color: var(--text);">${who}</span>
                        </div>
                        <div style="font-size: 18px; font-weight: 900; line-height: 1.4; margin-bottom: 8px;">${activity}</div>
                        <div style="font-size: 15px; font-weight: 700; opacity: 0.6; line-height: 1.6;">
                            📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;" onclick="event.stopPropagation()">Get Directions</a>
                            ${addressDisplayHtml}
                        </div>
                    </div>
                `;

                // NEW: Inject Sticky Headers for City pages
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
    
    if (todayCount === 0) htmlToday = '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">Nothing Scheduled</div></div>';
    if (tomorrowCount === 0) htmlTomorrow = '<div class="empty-state"><span class="empty-icon">📅</span><div class="empty-text">No Plans Yet</div></div>';
    
    document.getElementById('la-itinerary').innerHTML = htmlLA;
    document.getElementById('utah-itinerary').innerHTML = htmlUtah;
    document.getElementById('vegas-itinerary').innerHTML = htmlVegas;
    document.getElementById('today-itinerary').innerHTML = htmlToday;
    document.getElementById('tomorrow-itinerary').innerHTML = htmlTomorrow;
    
    renderAccommodations();
}

function updateFamilyFilter() {
    const selectedFamily = document.getElementById('family-selector').value;
    localStorage.setItem('savedFamilyFilter', selectedFamily);
    renderItinerary();
}

// ==========================================
// 5. WEATHER ENGINE 
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (code) => { 
    const map = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
    return map[code] || '🌤️'; 
};

const escapeHTML = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '''); 
};

async function initWeather() { 
    const wDash = document.getElementById('WTH-dashboard');
    const hwDesc = document.getElementById('hw-desc');
    const hwLoc = document.getElementById('hw-loc');
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => { 
                try { 
                    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                    const data = await res.json(); 
                    if (!data.weather) throw new Error("Weather data missing");

                    const temp = `${Math.round(data.main.temp)}°C`; 
                    const currentIcon = getWeatherIcon(data.weather[0].icon); 
                    const currentDesc = data.weather[0].description;
                    
                    const hwIcon = document.getElementById('hw-icon'); 
                    const hwTemp = document.getElementById('hw-temp'); 
                    
                    if(hwIcon) hwIcon.innerText = currentIcon; 
                    if(hwTemp) hwTemp.innerText = temp; 
                    if(hwDesc) hwDesc.innerText = currentDesc;
                    if(hwLoc) hwLoc.innerText = `📍 ${data.name}`;

                    const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${W_API_KEY}&units=metric`); 
                    const fData = await fRes.json();
                    const dailyData = fData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5);
                    
                    let forecastHtml = dailyData.map(day => { 
                        const dateObj = new Date(day.dt * 1000); 
                        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
                        return `<div class="WTH-card"><span class="WTH-day">${dayName}</span><span class="WTH-icon">${getWeatherIcon(day.weather[0].icon)}</span><span class="WTH-temps">${Math.round(day.main.temp)}°C</span></div>`; 
                    }).join('');
                    
                    if(wDash) { 
                        wDash.innerHTML = `<div class="WTH-hero"><div class="WTH-icon" style="font-size: 60px;">${currentIcon}</div><div class="WTH-hero-temp">${temp}</div><div class="WTH-hero-desc">${currentDesc}</div><div style="font-size: 15px; font-weight: 900; color: var(--text); opacity: 0.5; margin-top: 20px; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(data.name)}</div></div><h3 class="ADM-hdr" style="margin: 30px 0 15px;">5-Day Forecast</h3>${forecastHtml}`; 
                    }
                } catch (e) { 
                    if (wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><div class="empty-text">Weather Offline</div></div>`; 
                    if (hwDesc) hwDesc.innerText = "Weather unavailable";
                    if (hwLoc) hwLoc.innerText = "📍 Offline";
                } 
            },
            (err) => {
                if (wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📍</span><div class="empty-text">GPS Denied</div></div>`;
                if (hwDesc) hwDesc.innerText = "Location access denied";
                if (hwLoc) hwLoc.innerText = "📍 GPS Denied";
            }
        );
    } else {
        if (wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📍</span><div class="empty-text">GPS Unavailable</div></div>`;
        if (hwDesc) hwDesc.innerText = "GPS unavailable";
        if (hwLoc) hwLoc.innerText = "📍 No GPS";
    }
}

// ==========================================
// 6. APP INITIALIZATION 
// ==========================================
window.onload = () => {
    const savedTheme = localStorage.getItem('HolidayPlanner_Theme') === 'true';
    applyTheme(savedTheme);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date-display').textContent = new Date().toLocaleDateString(undefined, options);

    // Initialize New Features
    updateTimeAndCountdown();
    setInterval(updateTimeAndCountdown, 60000); // Update clock every minute
    renderTravelVault();

    initWeather();
    loadItinerary();
};

// ==========================================
// 7. PWA & SERVICE WORKER LOGIC
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully.', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

function syncUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) { registration.update(); }
        });
        alert("Syncing updates! The app will now reload.");
        window.location.reload(true); 
    } else {
        alert("Updating! The app will now reload.");
        window.location.reload(true);
    }
}
