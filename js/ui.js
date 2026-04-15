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
    const activePage = document.querySelector('.tab-content.active')?.id || 'splash';
    updateMetaThemeColor(activePage, isDark);
}
export function setThemeMode(isDark) { applyTheme(isDark); localStorage.setItem('HolidayPlanner_Theme', isDark); }

export function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ff9500';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    else if (pageId === 'splash') metaColor = isDark ? '#0b0e14' : '#f2f5f9';
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = metaColor;
}

export function updateTimeAndCountdown() { 
    try {
        const now = new Date();
        
        const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timePT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Los_Angeles' }).format(now);
        const timeMT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Denver' }).format(now);

        const elLA = document.getElementById('time-la');
        const elVegas = document.getElementById('time-vegas');
        const elUtah = document.getElementById('time-utah');

        if(elLA) elLA.innerText = `🕒 Local Time: ${timePT}`;
        if(elVegas) elVegas.innerText = `🕒 Local Time: ${timePT}`;
        if(elUtah) elUtah.innerText = `🕒 Local Time: ${timeMT}`;

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
        
        const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
        let localTz = 'America/Los_Angeles'; let localTzLabel = '🇺🇸 Local (PT)';
        if (activeTab === 'utah') { localTz = 'America/Denver'; localTzLabel = '🇺🇸 Local (MT)'; }
        
        const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
        const localTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: localTz }).format(now);
        
        if(document.getElementById('clock-uk')) document.getElementById('clock-uk').innerText = ukTime;
        if(document.getElementById('clock-local')) document.getElementById('clock-local').innerText = localTime;
        if(document.getElementById('local-tz-label')) document.getElementById('local-tz-label').innerText = localTzLabel;
    } catch(e) {}
}

export function saveTripSettings() { localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); updateTimeAndCountdown(); }

export function switchDayView(day) { 
    const tV = document.getElementById('today-view'), tmV = document.getElementById('tomorrow-view');
    const bT = document.getElementById('btn-show-today'), bTm = document.getElementById('btn-show-tomorrow');
    if(!tV || !tmV) return;
    if (day === 'today') { tV.style.display = 'block'; tmV.style.display = 'none'; if(bT) { bT.style.backgroundColor = 'var(--accent)'; bT.style.color = 'white'; } if(bTm) { bTm.style.backgroundColor = 'var(--ios-grey)'; bTm.style.color = 'var(--text)'; } } 
    else { tV.style.display = 'none'; tmV.style.display = 'block'; if(bTm) { bTm.style.backgroundColor = 'var(--accent)'; bTm.style.color = 'white'; } if(bT) { bT.style.backgroundColor = 'var(--ios-grey)'; bT.style.color = 'var(--text)'; } }
}

export function convertCurrency() { 
    const usd = document.getElementById('usd-input')?.value;
    if(document.getElementById('gbp-output')) document.getElementById('gbp-output').innerText = usd ? `£${(usd / state.liveExchangeRate).toFixed(2)}` : `£0.00`;
}

export let currentTipPercent = 18;
export function setTip(percent, btnElement) { 
    currentTipPercent = percent; 
    document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); 
    calculateTip(); 
}
export function calculateTip() { 
    const b = parseFloat(document.getElementById('bill-total')?.value) || 0, s = parseInt(document.getElementById('split-ways')?.value) || 1;
    const t = b * (1 + (currentTipPercent / 100)), usd = t / s, gbp = usd / state.liveExchangeRate; 
    if(document.getElementById('tip-usd')) document.getElementById('tip-usd').innerText = `$${usd.toFixed(2)}`;
    if(document.getElementById('tip-gbp')) document.getElementById('tip-gbp').innerText = `£${gbp.toFixed(2)}`;
}

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All Activities</option>';
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    new Set([...state.sheetFamilies, ...customFamilies]).forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt);
    });
    const savedFamily = localStorage.getItem('savedFamilyFilter'); if (savedFamily) sel.value = savedFamily;
}

export function clearCustomFamilies() {
    if(confirm("Remove all old saved names from this device? This will instantly clean up your dropdown menus.")) {
        localStorage.removeItem('customFamilies');
        populateDropdown();
        updateFamilyFilter();
        alert("Memory cleared!");
    }
}

export function updateFamilyFilter() { const sel = document.getElementById('family-selector'); if(sel) localStorage.setItem('savedFamilyFilter', sel.value); renderItinerary(); renderTravelVault(); renderAccommodations(); }

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; return m[c] || '🌤️'; };
export async function setWeatherCity(target) {
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-w-${target}`); if (activeBtn) activeBtn.classList.add('active');
    const wDash = document.getElementById('WTH-dashboard'); if (wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><div class="empty-text">Syncing Radar...</div></div>`;
    try {
        let lat = 34.0522, lon = -118.2437, locName = "Los Angeles
