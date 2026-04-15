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

export function convertCurrency() { 
    const usd = document.getElementById('usd-input')?.value;
    // PERFECT MATH: $100 / 1.26 = £79.36
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
        let lat = 34.0522, lon = -118.2437, locName = "Los Angeles";
        if (target === 'utah') { lat = 37.0965; lon = -113.5684; locName = "Utah"; }
        else if (target === 'vegas') { lat = 36.1699; lon = -115.1398; locName = "Las Vegas"; }
        else if (target === 'local') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => { renderWeatherDOM(await fetchWeather(pos.coords.latitude, pos.coords.longitude), "Local GPS"); },
                    async (err) => { renderWeatherDOM(await fetchWeather(lat, lon), locName); }, { timeout: 5000 } 
                ); return;
            }
        }
        renderWeatherDOM(await fetchWeather(lat, lon), locName);
    } catch(e) { if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 Offline"; }
}
export function autoSetWeatherCity() {
    const now = new Date(); const savedStart = localStorage.getItem('tripStartDate'); let target = 'la'; 
    if (savedStart) { const tripDate = new Date(savedStart); if (now >= tripDate) target = 'local'; }
    setWeatherCity(target);
}
function renderWeatherDOM(data, fallbackName) {
    const d = data.current; const locName = fallbackName || d.name;
    if(document.getElementById('hw-icon')) document.getElementById('hw-icon').innerText = getWeatherIcon(d.weather[0].icon); 
    if(document.getElementById('hw-temp')) document.getElementById('hw-temp').innerText = `${Math.round(d.main.temp)}°C`; 
    if(document.getElementById('hw-desc')) document.getElementById('hw-desc').innerText = d.weather[0].description; 
    if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = `📍 ${locName}`;
    
    const mainWeather = d.weather[0].main.toLowerCase(); let bgImage = 'img/bg.jpg'; 
    if (mainWeather.includes('clear')) bgImage = 'img/clear.jpg'; else if (mainWeather.includes('cloud')) bgImage = 'img/clouds.jpg';
    else if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) bgImage = 'img/rain.jpg'; else if (mainWeather.includes('snow')) bgImage = 'img/snow.jpg';
    document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`);

    let forecastHtml = data.forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
        const dayName = new Date(day.dt * 1000).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); 
        return `<div class="WTH-card"><span class="WTH-day">${dayName}</span><span class="WTH-icon">${getWeatherIcon(day.weather[0].icon)}</span><span class="WTH-temps">${Math.round(day.main.temp)}°C</span></div>`; 
    }).join('');
    
    const wDash = document.getElementById('WTH-dashboard');
    if (wDash) wDash.innerHTML = `<div class="WTH-hero" style="backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 2px solid var(--accent);"><div class="WTH-icon" style="font-size: 60px;">${getWeatherIcon(d.weather[0].icon)}</div><div class="WTH-hero-temp" style="color: var(--accent);">${Math.round(d.main.temp)}°C</div><div class="WTH-hero-desc">${d.weather[0].description}</div><div style="font-size: 15px; font-weight: 900; color: var(--text); opacity: 0.5; margin-top: 20px; letter-spacing: 1px; text-transform: uppercase;">📍 ${escapeHTML(locName)}</div></div><h3 class="ADM-hdr" style="margin: 30px 0 15px;">5-Day Forecast</h3>${forecastHtml}`; 
}

export async function renderItinerary() {
    const filter = document.getElementById('family-selector')?.value || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} };
    let cLA = '', cUtah = '', cVegas = ''; 
    
    state.itineraryData.forEach(cols => {
        if(cols.length < 5) return;
        const d = cols[0].trim(); const loc = cols[1].trim(); const act = cols[2].trim(); 
        const time = cols[3].trim(); const who = cols[4].trim(); const addr = (cols.length >= 6) ? cols[5].trim() : '';
        
        if (filter === 'All' || who.toLowerCase() === filter.toLowerCase() || who.toLowerCase() === 'everyone') {
            const searchLoc = addr !== '' ? addr : `${act} ${loc}`; 
            const mapLink = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(searchLoc);
            const addrHtml = addr ? `<br><span style="font-size: 13px; font-weight: 600; opacity: 0.8; display: inline-block; margin-top: 6px;">🗺️ ${escapeHTML(addr)}</span>` : '';
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            
            let cardClass = isCompleted ? 'admin-card itin-card completed' : 'admin-card itin-card';
            let badgeHtml = isCompleted ? `<span style="background: #34c759; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; color: white; box-shadow: 0 2px 10px rgba(52, 199, 89, 0.4);">✅ DONE</span>` : `<span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; color: var(--text);">${escapeHTML(who)}</span>`;
            
            const cardHtml = `
                <div class="${cardClass}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="text-align: left; transition: all 0.3s ease; cursor: pointer; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                        <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>${badgeHtml}
                    </div>
                    <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3; margin-bottom: 8px;">${escapeHTML(act)}</div>
                    <div style="font-size: 14px; font-weight: 700; opacity: 0.7; line-height: 1.5;">📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;">Get Directions</a>${addrHtml}</div>
                </div>`;

            const pushToGroup = (city, dateStr) => {
                if (!grouped[city][dateStr]) grouped[city][dateStr] = [];
                grouped[city][dateStr].push(cardHtml);
            };

            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : pushToGroup('la', d); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : pushToGroup('utah', d); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : pushToGroup('vegas', d); }
        }
    });

    const buildAccordion = (cityObj) => {
        let html = '';
        for (const [date, cards] of Object.entries(cityObj)) {
            const count = cards.length;
            const countBadge = `<span class="item-count">${count} Item${count > 1 ? 's' : ''}</span>`;
            html += `
            <details class="day-group">
                <summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}${countBadge}</span></summary>
                <div class="day-content">${cards.join('')}</div>
            </details>`;
        }
        return html;
    };

    const updateSec = (id, h, c) => {
        const m = document.getElementById(`${id}-itinerary`); const l = document.getElementById(`${id}-completed-list`); const w = document.getElementById(`${id}-completed-section`);
        if(m) m.innerHTML = h || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">No active plans</div></div>';
        if(l && w) { if(c) { l.innerHTML = c; w.style.display = 'block'; } else w.style.display = 'none'; }
    };
    
    updateSec('la', buildAccordion(grouped['la']), cLA); 
    updateSec('utah', buildAccordion(grouped['utah']), cUtah); 
    updateSec('vegas', buildAccordion(grouped['vegas']), cVegas); 
}

export function renderTravelVault() { 
    const filter = document.getElementById('family-selector')?.value || 'All';
    const display = document.getElementById('flights-vault-display'); const emptyState = document.getElementById('empty-vault-state');
    if(!display) return;
    let html = ''; let hasData = false;
    const sortedData = [...state.vaultAndStaysData].sort((a,b) => parseDateTime(a[2]) - parseDateTime(b[2]));
    
    const leech = ['graeme', 'dawn', 'grace', 'leech'];
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    sortedData.forEach(cols => {
        if(cols.length < 2) return;
        const fam = cols[0].trim(); const type = cols[1].trim().toLowerCase();
        
        let isMatch = false;
        const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true;
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true;
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true;
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;

        if (isMatch) {
            if (type === 'flight') {
                hasData = true; const date = escapeHTML(cols[2]?.trim() || ''); const dep = escapeHTML(cols[3]?.trim() || ''); const arr = escapeHTML(cols[4]?.trim() || '');
                const airline = escapeHTML(cols[5]?.trim().toUpperCase() || ''); const fnum = escapeHTML(cols[6]?.trim() || ''); const ftime = escapeHTML(cols[7]?.trim() || ''); 
                
                const flightId = btoa(encodeURIComponent(`${date}-${airline}-${fnum}`)).replace(/=/g, '');
                const baseTerm = escapeHTML(cols[8]?.trim() || '');
                const activeTerm = (state.gateOverrides && state.gateOverrides[flightId]) ? state.gateOverrides[flightId] : baseTerm;

                const ref = escapeHTML(cols[9]?.trim() || '');
                const searchStr = (airline + fnum).replace(/\s+/g, ''); const trackerLink = searchStr ? "https://flightaware.com/live/flight/" + searchStr : "#";
                
                html += `
                <div class="admin-card travel-card" data-type="flight" data-flightid="${flightId}" data-fam="${escapeHTML(fam)}" data-date="${date}" data-dep="${dep}" data-arr="${arr}" data-airline="${airline}" data-fnum="${fnum}" data-ftime="${ftime}" data-term="${activeTerm}" data-ref="${ref}" data-link="${trackerLink}" style="padding: 20px; margin-bottom: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-left: 5px solid var(--accent);">
                    <div>
                        <div style="font-size: 11px; font-weight: 900; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">✈️ Flight • ${date}</div>
                        <strong style="font-size: 18px;">${dep} → ${arr}</strong>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: 800; color: var(--accent);">${airline} ${fnum}</div>
                        <div style="font-size: 12px; font-weight: 700; opacity: 0.6;">${ftime}</div>
                    </div>
                </div>`;
            } else if (type === 'car') {
                hasData = true;
                const pdate = escapeHTML(cols[2]?.trim()); const ddate = escapeHTML(cols[3]?.trim()); const company = escapeHTML(cols[4]?.trim()); const ploc = escapeHTML(cols[5]?.trim()); const ptime = escapeHTML(cols[6]?.trim()); const dtime = escapeHTML(cols[7]?.trim()); const dloc = escapeHTML(cols[8]?.trim()) || ploc; const ref = escapeHTML(cols[9]?.trim());

                html += `
                <div class="admin-card travel-card" data-type="car" data-fam="${escapeHTML(fam)}" data-company="${company}" data-pdate="${pdate}" data-ptime="${ptime}" data-ploc="${ploc}" data-ddate="${ddate}" data-dtime="${dtime}" data-dloc="${dloc}" data-ref="${ref}" style="padding: 20px; margin-bottom: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-left: 5px solid #34c759;">
                    <div>
                        <div style="font-size: 11px; font-weight: 900; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">🚗 Car Rental • ${pdate}</div>
                        <strong style="font-size: 18px;">${company}</strong>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: 800; color: #34c759;">Pick-up</div>
                        <div style="font-size: 12px; font-weight: 700; opacity: 0.6;">${ploc}</div>
                    </div>
                </div>`;
            }
        }
    });
    display.innerHTML = html; if(emptyState) emptyState.style.display = hasData ? 'none' : 'flex';
}

export function renderAccommodations() { 
    const filter = document.getElementById('family-selector')?.value || 'All'; const today = new Date(); today.setHours(0,0,0,0);
    let htmlLA = '', htmlUtah = '', htmlVegas = '';
    
    const leech = ['graeme', 'dawn', 'grace', 'leech'];
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    state.vaultAndStaysData.forEach(cols => {
        if(cols.length < 2) return;
        const fam = cols[0].trim(); const type = cols[1].trim().toLowerCase();
        
        let isMatch = false;
        const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true;
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true;
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true;
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;

        if (type === 'stay' && isMatch) {
            const checkIn = cols[2]?.trim() || ''; 
            const city = cols[3]?.trim() || ''; 
            const address = cols[4]?.trim() || ''; 
            const checkOut = cols[5]?.trim() || ''; 
            const link = cols[6]?.trim() || ''; 
            const imgUrl = cols[7]?.trim() || '';
            
            const headerBg = imgUrl ? `url('${imgUrl}') center/cover` : `var(--accent)`; 
            const mapLink = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address);
            
            const ui = `<div class="admin-card stay-card" data-fam="${escapeHTML(fam)}" data-addr="${escapeHTML(address)}" data-map="${escapeHTML(mapLink)}" data-link="${escapeHTML(link)}" data-img="${escapeHTML(imgUrl)}" style="padding: 0; overflow: hidden; margin-bottom: 24px; cursor: pointer; transition: transform 0.2s ease;">
                <div style="height: 100px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                    <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3>
                </div>
            </div>`;
            
            if(city.toLowerCase().includes('la')) htmlLA += ui; else if(city.toLowerCase().includes('utah')) htmlUtah += ui; else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;
        }
    });
    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA; const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
    const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
}

export async function handleFileUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File is too large. Please upload something under 10MB."); return; }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        let docs = await getVal('offline_docs') || [];
        docs.push({ id: Date.now().toString(), name: file.name, type: file.type, data: e.target.result });
        await setVal('offline_docs', docs);
        renderWallet();
    };
    reader.readAsDataURL(file);
}

export async function renderWallet() {
    const docs = await getVal('offline_docs') || [];
    const gallery = document.getElementById('wallet-gallery');
    if(!gallery) return;
    if(docs.length === 0) { gallery.innerHTML = '<div style="grid-column: span 2; opacity:0.5; text-align:center; font-size:12px;">No documents saved yet.</div>'; return; }
    
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
    document.getElementById('modal-task-name').innerText = taskName; document.getElementById('modal-checkbox').checked = false;
    document.getElementById('btn-confirm-modal').style.opacity = '0.5'; document.getElementById('btn-confirm-modal').style.pointerEvents = 'none';
    const modal = document.getElementById('completion-modal'); modal.dataset.activeTaskId = taskId;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); 
}
export function closeCompletionModal() {
    const modal = document.getElementById('completion-modal'); modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 300);
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

export function spinRoulette() {
    const res = document.getElementById('roulette-result');
    const btn = document.getElementById('btn-spin-roulette');
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    if(!res || !btn || btn.disabled) return;
    btn.disabled = true; btn.style.opacity = '0.5';
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it down the middle"];
    let ticks = 0; const maxTicks = 20;
    const interval = setInterval(() => {
        if(navigator.vibrate) navigator.vibrate(10);
        res.innerText = names[Math.floor(Math.random() * names.length)];
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(interval);
            if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
            res.style.transform = 'scale(1.2)';
            setTimeout(() => res.style.transform = 'scale(1)', 200);
            btn.disabled = false; btn.style.opacity = '1';
        }
    }, 100);
}

let currentTipsCity = 'la';
export function openTipsModal(city) {
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
    modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 300);
}

export function renderTips(category) {
    const filter = document.getElementById('family-selector')?.value || 'All';
    const contentDiv = document.getElementById('tips-content');
    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(cols.length < 5) return;
        const fam = cols[0].trim(); const type = cols[1].trim().toLowerCase(); const city = cols[2]?.trim().toLowerCase(); const cat = cols[3]?.trim().toLowerCase(); const details = cols[4]?.trim();
        if (type === 'tip' && city.includes(currentTipsCity) && cat === category) {
            if (filter === 'All' || fam.toLowerCase() === filter.toLowerCase() || fam.toLowerCase() === 'everyone') {
                const badge = fam.toLowerCase() !== 'everyone' ? `<span style="background: var(--accent-gradient); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; color: white; display: inline-block; margin-top: 8px;">👤 ${escapeHTML(fam)}</span>` : '';
                html += `<div class="admin-card" style="padding: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 700; line-height: 1.5;">${escapeHTML(details)}<br>${badge}</div></div>`;
            }
        }
    });
    if (!html) html = `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">👻</span><div class="empty-text" style="font-size: 16px;">No tips saved for this category yet!</div></div>`;
    contentDiv.innerHTML = html;
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('stay-modal');
    const hero = document.getElementById('stay-modal-hero');
    const title = document.getElementById('stay-modal-title');
    const address = document.getElementById('stay-modal-addr');
    const btns = document.getElementById('stay-modal-buttons');

    hero.style.backgroundImage = imgUrl ? `url('${imgUrl}')` : `none`;
    if(!imgUrl) hero.style.backgroundColor = `var(--accent)`;
    
    title.innerText = `🏡 ${fam} Stay`; address.innerText = `📍 ${addr}`;
    
    let btnHtml = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1; padding: 16px; font-size: 16px;">🚗 Drive</button>`;
    if (listLink && listLink !== "undefined" && listLink !== "") { btnHtml += `<button class="action-btn link-btn" data-url="${listLink}" style="flex: 1; padding: 16px; font-size: 16px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>`; }
    btns.innerHTML = btnHtml;

    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeStayModal() {
    const modal = document.getElementById('stay-modal');
    modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 300);
}

export function openTravelModal(cardData) {
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
    modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 300);
}
