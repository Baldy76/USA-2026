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
    const meta = document.getElementById('theme-meta'); if (meta) meta.content = metaColor;
}

export function updateTimeAndCountdown() { 
    try {
        const now = new Date();
        const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
        const timePT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Los_Angeles' }).format(now);
        const timeMT = new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/Denver' }).format(now);
        const elLA = document.getElementById('time-la'); const elVegas = document.getElementById('time-vegas'); const elUtah = document.getElementById('time-utah');
        if(elLA) elLA.innerText = `🕒 Local: ${timePT}`; if(elVegas) elVegas.innerText = `🕒 Local: ${timePT}`; if(elUtah) elUtah.innerText = `🕒 Local: ${timeMT}`;

        const cContainer = document.getElementById('countdown-display'); const clockContainer = document.getElementById('dual-clocks');
        if(!cContainer || !clockContainer) return;

        const savedStart = localStorage.getItem('tripStartDate');
        if (savedStart) {
            const input = document.getElementById('trip-start-date'); if(input) input.value = savedStart;
            const tripDate = new Date(savedStart);
            if (!isNaN(tripDate.getTime())) {
                tripDate.setHours(0,0,0,0); const diff = tripDate - now;
                if (diff > 0) {
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    document.getElementById('cd-text').innerHTML = `🚀 ${days} Days!`;
                    cContainer.style.display = 'block'; clockContainer.style.display = 'none'; return; 
                }
            }
        } 
        cContainer.style.display = 'none'; clockContainer.style.display = 'block';
    } catch(e) {}
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

const getWeatherIcon = (c) => { const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨' }; return m[c] || '🌤️'; };

export async function initWeatherPill() {
    const loadSummary = async (lat, lon, id) => {
        try {
            const data = await fetchWeather(lat, lon);
            document.getElementById(id).innerHTML = `${getWeatherIcon(data.current.weather[0].icon)} ${Math.round(data.current.main.temp)}°`;
        } catch(e) { document.getElementById(id).innerHTML = '🚫'; }
    };
    loadSummary(34.0522, -118.2437, 'wp-la'); loadSummary(37.0965, -113.5684, 'wp-utah'); loadSummary(36.1699, -115.1398, 'wp-vegas');
}

export async function setWeatherCity(target) {
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-w-${target}`); if (activeBtn) activeBtn.classList.add('active');
    try {
        let lat = 34.0522, lon = -118.2437;
        if (target === 'utah') { lat = 37.0965; lon = -113.5684; }
        else if (target === 'vegas') { lat = 36.1699; lon = -115.1398; }
        const data = await fetchWeather(lat, lon);
        renderWeatherDOM(data, target);
    } catch(e) {}
}

export function openWeatherModal() {
    document.getElementById('weather-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('weather-modal').classList.add('active'), 10);
    setWeatherCity('la');
}
export function closeWeatherModal() { document.getElementById('weather-modal').classList.remove('active'); setTimeout(() => document.getElementById('weather-modal').style.display = 'none', 300); }

function renderWeatherDOM(data, fallbackName) {
    const d = data.current;
    let forecastHtml = data.forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5).map(day => { 
        return `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;"><span>${new Date(day.dt*1000).toLocaleDateString('en-GB',{weekday:'short'})}</span><span>${getWeatherIcon(day.weather[0].icon)}</span><span>${Math.round(day.main.temp)}°C</span></div>`;
    }).join('');
    document.getElementById('WTH-dashboard').innerHTML = `<div style="text-align:center; padding:20px; background:rgba(0,122,255,0.1); border-radius:15px; margin-bottom:20px;"><div style="font-size:50px;">${getWeatherIcon(d.weather[0].icon)}</div><div style="font-size:40px; font-weight:900;">${Math.round(d.main.temp)}°C</div><div style="text-transform:capitalize;">${d.weather[0].description}</div></div>${forecastHtml}`;
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
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            const cardHtml = `<div class="admin-card itin-card ${isCompleted?'completed':''}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding:20px; margin-bottom:16px;"><strong style="font-size:15px;">${escapeHTML(time)}</strong><div style="font-size:17px; font-weight:900;">${escapeHTML(act)}</div><div style="font-size:12px; opacity:0.6;">${escapeHTML(who)}</div></div>`;
            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : (grouped['la'][d] = grouped['la'][d] || [], grouped['la'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : (grouped['utah'][d] = grouped['utah'][d] || [], grouped['utah'][d].push(cardHtml)); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : (grouped['vegas'][d] = grouped['vegas'][d] || [], grouped['vegas'][d].push(cardHtml)); }
        }
    });

    const buildSec = (cityObj) => {
        let html = ''; for (const [date, cards] of Object.entries(cityObj)) {
            html += `<details class="day-group"><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)}</span></summary><div class="day-content">${cards.join('')}</div></details>`;
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
                html += `<div class="admin-card travel-card" data-type="flight" data-date="${date}" data-dep="${dep}" data-arr="${arr}" data-airline="${air}" data-fnum="${fn}" data-ftime="${ft}" data-term="${term}" data-ref="${ref}" style="border-left:5px solid var(--accent); cursor:pointer;"><div style="display:flex; justify-content:space-between;"><span>✈️ ${date}</span><strong>${air} ${fn}</strong></div><div style="font-size:18px; font-weight:900; margin-top:10px;">${dep} → ${arr}</div></div>`;
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

export function spinRoulette() {
    const res = document.getElementById('roulette-result');
    const mode = document.getElementById('roulette-mode').value;
    const btn = document.getElementById('btn-spin-roulette');
    if(btn.disabled) return; btn.disabled = true;
    
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it"];
    let html = ''; for(let i=0; i<40; i++) html += `<div class="roulette-item">${names[Math.floor(Math.random()*names.length)]}</div>`;
    const winner = names[Math.floor(Math.random()*names.length)];
    html += `<div class="roulette-item winner">${winner}</div>`;
    
    res.style.transition = 'none'; res.style.transform = 'translateY(0px)'; res.innerHTML = html;
    res.offsetHeight; 
    res.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    res.style.transform = `translateY(-${40 * 70}px)`;
    
    setTimeout(() => {
        btn.disabled = false; triggerConfetti();
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
    }, 4500);
}

export function openStayModal(fam, addr, mapLink, listLink, imgUrl) {
    document.getElementById('stay-modal-hero').style.backgroundImage = imgUrl ? `url('${imgUrl}')` : `none`;
    document.getElementById('stay-modal-title').innerText = `🏡 ${fam} Stay`; document.getElementById('stay-modal-addr').innerText = addr;
    document.getElementById('stay-modal-buttons').innerHTML = `<button class="action-btn link-btn" data-url="${mapLink}" style="flex:1;">Drive</button>${listLink?`<button class="action-btn link-btn" data-url="${listLink}" style="flex:1;">Listing</button>`:''}`;
    document.getElementById('stay-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('stay-modal').classList.add('active'), 10);
}
export function closeStayModal() { document.getElementById('stay-modal').classList.remove('active'); setTimeout(() => document.getElementById('stay-modal').style.display = 'none', 300); }

export function openTravelModal(cardData) {
    const content = document.getElementById('travel-modal-content');
    if (cardData.type === 'flight') {
        content.innerHTML = `<div class="flight-card" style="margin:0;"><div class="flight-header"><span>✈️ ${cardData.date}</span><strong>${cardData.airline} ${cardData.fnum}</strong></div><div class="flight-path"><strong>${cardData.dep}</strong><span>✈️</span><strong>${cardData.arr}</strong></div><div>Gate: ${cardData.term||'Check board'}</div><div>Ref: ${cardData.ref}</div><div class="barcode"></div></div>`;
    } else {
        content.innerHTML = `<div style="padding:20px;"><h3>🚗 ${cardData.company}</h3><p>Pick-up: ${cardData.ploc} (${cardData.pdate})</p><p>Ref: ${cardData.ref}</p></div>`;
    }
    document.getElementById('travel-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('travel-modal').classList.add('active'), 10);
}
export function closeTravelModal() { document.getElementById('travel-modal').classList.remove('active'); setTimeout(() => document.getElementById('travel-modal').style.display = 'none', 300); }
