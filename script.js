// 1. Core Itinerary Data
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

// 2. Vault & Stays Data
const vaultUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=96079970&single=true&output=csv';

let itineraryData = []; 
let vaultAndStaysData = [];
let sheetFamilies = new Set(); 
let liveExchangeRate = 1.27; 

// ==========================================
// 0. RING-FENCE ERROR HANDLER & ESCAPER
// ==========================================
function safeRun(moduleName, func) {
    try { func(); } catch (error) { console.error(`[MODULE ISOLATED] Error in ${moduleName}:`, error); }
}

async function safeRunAsync(moduleName, func) {
    try { await func(); } catch (error) { console.error(`[MODULE ISOLATED] Async error in ${moduleName}:`, error); }
}

const escapeHTML = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&" + "amp;")
        .replace(/</g, "&" + "lt;")
        .replace(/>/g, "&" + "gt;")
        .replace(/"/g, "&" + "quot;")
        .replace(/'/g, "&" + "#39;"); 
};

function parseDateTime(dateStr, timeStr = '') {
    dateStr = dateStr ? dateStr.trim() : '';
    timeStr = timeStr ? timeStr.trim() : '';
    if(!dateStr) return 0;
    
    let d = new Date(`${dateStr} ${timeStr}`.trim());
    if (isNaN(d)) {
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) d = new Date(`${parts[2]}/${parts[1]}/${parts[0]} ${timeStr}`);
    }
    return isNaN(d) ? 0 : d.getTime();
}

// FEATURE: Bulletproof CSV Parser (Handles inner-cell line breaks)
function parseCSV(str) {
    const arr = [];
    let quote = false;
    let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr;
}

// ==========================================
// 1. THEME & NEW SPA NAVIGATION ENGINE
// ==========================================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
    const activePage = document.querySelector('.tab-content.active')?.id || 'splash';
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
    else if (pageId === 'splash') metaColor = isDark ? '#0b0e14' : '#f2f5f9';
    
    const meta = document.getElementById('theme-meta'); 
    if (meta) meta.content = metaColor;
}

window.openTab = (pageId, buttonId = null) => { safeRun('Navigation', () => {
    if (navigator.vibrate) navigator.vibrate(40); 

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if(targetPage) { 
        targetPage.classList.add('active'); 
    }

    if (buttonId) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(buttonId); 
        if(activeBtn) activeBtn.classList.add('active');
    }

    document.body.classList.remove('theme-splash', 'theme-la', 'theme-utah', 'theme-vegas', 'theme-flights');
    if (pageId === 'splash') document.body.classList.add('theme-splash');
    else if (pageId === 'la') document.body.classList.add('theme-la');
    else if (pageId === 'utah') document.body.classList.add('theme-utah');
    else if (pageId === 'vegas') document.body.classList.add('theme-vegas');
    else if (pageId === 'flights') document.body.classList.add('theme-flights');
    
    updateMetaThemeColor(pageId);
    window.scrollTo(0,0); 
})};

function switchDayView(day) { safeRun('SwitchDay', () => {
    const todayView = document.getElementById('today-view');
    const tomorrowView = document.getElementById('tomorrow-view');
    const btnToday = document.getElementById('btn-show-today');
    const btnTomorrow = document.getElementById('btn-show-tomorrow');
    if(!todayView || !tomorrowView) return;

    if (day === 'today') {
        todayView.style.display = 'block'; tomorrowView.style.display = 'none';
        if(btnToday) { btnToday.style.backgroundColor = 'var(--accent)'; btnToday.style.color = 'white'; }
        if(btnTomorrow) { btnTomorrow.style.backgroundColor = 'var(--ios-grey)'; btnTomorrow.style.color = 'var(--text)'; }
    } else {
        todayView.style.display = 'none'; tomorrowView.style.display = 'block';
        if(btnTomorrow) { btnTomorrow.style.backgroundColor = 'var(--accent)'; btnTomorrow.style.color = 'white'; }
        if(btnToday) { btnToday.style.backgroundColor = 'var(--ios-grey)'; btnToday.style.color = 'var(--text)'; }
    }
})};

function toggleComplete(element) { safeRun('ToggleComplete', () => {
    if (element.style.opacity === '0.5') { element.style.opacity = '1'; element.style.transform = 'scale(1)'; } 
    else { element.style.opacity = '0.5'; element.style.transform = 'scale(0.98)'; }
})};

// FEATURE: Smart Tab Routing
function calculateSmartTab() {
    let smartTab = 'home';
    let smartNavBtn = 'nav-btn-home';
    const now = new Date();
    const todayStr = now.toDateString();
    
    const savedStart = localStorage.getItem('tripStartDate');
    if (savedStart) {
        const tripDate = new Date(savedStart);
        tripDate.setHours(0,0,0,0);
        if (now >= tripDate) {
            for (let cols of itineraryData) {
                if (cols.length >= 5) {
                    const d = new Date(parseDateTime(cols[0]));
                    if (d.toDateString() === todayStr) {
                        const loc = cols[1].toLowerCase();
                        if (loc.includes('la')) { smartTab = 'la'; smartNavBtn = 'nav-btn-la'; break; }
                        if (loc.includes('utah')) { smartTab = 'utah'; smartNavBtn = 'nav-btn-utah'; break; }
                        if (loc.includes('vegas')) { smartTab = 'vegas'; smartNavBtn = 'nav-btn-vegas'; break; }
                    }
                }
            }
        }
    }
    const splashBtn = document.getElementById('splash-go-btn');
    if (splashBtn) {
        splashBtn.setAttribute('onclick', `openTab('${smartTab}', '${smartNavBtn}')`);
    }
}

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
// 3. MASTER CLOUD DATA ENGINE (WITH OFFLINE MODE)
// ==========================================
async function loadAllData() {
    let itinData = '';
    let vData = '';

    try {
        const cacheBuster = `&t=${Date.now()}`;
        const [itineraryRes, vaultRes] = await Promise.all([
            fetch(sheetUrl + cacheBuster),
            fetch(vaultUrl + cacheBuster)
        ]);
        
        if (!itineraryRes.ok || !vaultRes.ok) {
            throw new Error("Google Sheets returned an error status.");
        }

        itinData = await itineraryRes.text();
        vData = await vaultRes.text();

        localStorage.setItem('offline_itinerary', itinData);
        localStorage.setItem('offline_vault', vData);

    } catch (e) { 
        console.warn("[OFFLINE MODE] No internet connection or API failed. Loading backup data..."); 
        itinData = localStorage.getItem('offline_itinerary') || '';
        vData = localStorage.getItem('offline_vault') || '';
        
        if (!itinData && !vData) {
            console.error("[OFFLINE MODE] No backup data found.");
            return;
        }
    }

    try {
        // Updated to use the robust CSV Parser
        if (itinData) {
            itineraryData = parseCSV(itinData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
            itineraryData.sort((a, b) => {
                if (a.length < 5 || b.length < 5) return 0;
                return parseDateTime(a[0], a[3]) - parseDateTime(b[0], b[3]);
            });
            itineraryData.forEach(col => {
                if (col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') {
                    sheetFamilies.add(col[4].trim());
                }
            });
        }

        if (vData) {
            vaultAndStaysData = parseCSV(vData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
            vaultAndStaysData.forEach(col => {
                if (col.length > 0 && col[0].trim().toLowerCase() !== 'everyone') {
                    sheetFamilies.add(col[0].trim());
                }
            });
        }

        safeRun('PopulateDropdown', populateDropdown);
        safeRun('RenderItinerary', renderItinerary);
        safeRun('RenderVault', renderTravelVault);
        safeRun('RenderAcc', renderAccommodations);
        
        // Run New Features
        safeRun('CalculateSmartTab', calculateSmartTab);
        safeRunAsync('PreCacheImages', preCacheImages);

    } catch (parseError) { 
        console.error("[MODULE ISOLATED] Data Parsing Failed:", parseError); 
    }
}

function populateDropdown() {
    const mainSelect = document.getElementById('family-selector');
    if(mainSelect) mainSelect.innerHTML = '<option value="All">Show All Activities</option>';
    
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);
    
    allFamilies.forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f;
        if(mainSelect) mainSelect.appendChild(opt);
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

// FEATURE: Pre-Cache Vault Images
async function preCacheImages() {
    if ('caches' in window) {
        try {
            const cache = await caches.open('holiday-planner-v2.1.0');
            const imgUrls = vaultAndStaysData
                .map(cols => cols[7] ? cols[7].trim() : '')
                .filter(url => url.startsWith('http'));
            
            if (imgUrls.length > 0) {
                imgUrls.forEach(url => {
                    cache.match(url).then(res => {
                        if (!res) fetch(url, { mode: 'no-cors' }).then(response => cache.put(url, response)).catch(() => {});
                    });
                });
            }
        } catch (e) { console.log('Pre-caching failed', e); }
    }
}

// ==========================================
// 4. VAULT & ACCOMMODATION RENDERING
// ==========================================
function renderTravelVault() { safeRun('RenderVault', () => {
    const filter = document.getElementById('family-selector')?.value || 'All';
    const display = document.getElementById('flights-vault-display');
    const emptyState = document.getElementById('empty-vault-state');
    if(!display) return;

    let html = '';
    let hasData = false;

    const sortedData = [...vaultAndStaysData].sort((a,b) => {
        return parseDateTime(a[2]) - parseDateTime(b[2]); 
    });

    sortedData.forEach(cols => {
        if(cols.length < 2) return;
        
        const fam = cols[0].trim();
        const type = cols[1].trim().toLowerCase();
        
        if (filter === 'All' || fam.toLowerCase() === filter.toLowerCase() || fam.toLowerCase() === 'everyone') {
            
            if (type === 'flight') {
                hasData = true;
                const date = escapeHTML(cols[2]?.trim());
                const dep = escapeHTML(cols[3]?.trim());
                const arr = escapeHTML(cols[4]?.trim());
                const airline = escapeHTML(cols[5]?.trim().toUpperCase());
                const fnum = escapeHTML(cols[6]?.trim());
                const ftime = escapeHTML(cols[7]?.trim());
                const term = escapeHTML(cols[8]?.trim());
                const ref = escapeHTML(cols[9]?.trim());

                const searchStr = (airline + fnum).replace(/\s+/g, '');
                const trackerLink = searchStr ? "https://flightaware.com/live/flight/" + searchStr : "#";
                const linkHtml = searchStr ? `<a href="${escapeHTML(trackerLink)}" target="_blank" class="flight-tracker-link">${airline} ${fnum} ↗</a>` : `${airline} ${fnum}`;

                html += `
                <div class="flight-card">
                    <div class="flight-header">
                        <span class="flight-num">${linkHtml}</span>
                        <span style="font-size:12px; font-weight:800; opacity:0.8; text-align: right;">${date} <br> TIME: ${ftime}</span>
                    </div>
                    <div class="flight-path">
                        <div class="path-node"><span>From</span><strong>${dep}</strong></div>
                        <div class="plane-icon"></div>
                        <div class="path-node"><span>To</span><strong>${arr}</strong></div>
                    </div>
                    <div style="margin-top:15px; display:flex; justify-content: space-between; align-items:center; font-size:13px; font-weight:700; opacity:0.9;">
                        <span>Term/Gate: ${term || "Check Screens"}</span>
                        <span>Ref: ${ref}</span>
                    </div>
                    <div class="barcode"></div>
                </div>`;
            } 
            else if (type === 'car') {
                hasData = true;
                const pickupDate = escapeHTML(cols[2]?.trim());
                const dropoffDate = escapeHTML(cols[3]?.trim());
                const company = escapeHTML(cols[4]?.trim());
                const pickupLoc = escapeHTML(cols[5]?.trim());
                const pickupTime = escapeHTML(cols[6]?.trim());
                const dropoffTime = escapeHTML(cols[7]?.trim());
                const dropoffLoc = escapeHTML(cols[8]?.trim());
                const ref = escapeHTML(cols[9]?.trim());

                html += `
                <div class="admin-card" style="margin-bottom:24px; border-left: 5px solid var(--accent);">
                    <div style="font-size:11px; font-weight:900; opacity:0.5; text-transform:uppercase; letter-spacing: 0.5px;">🚗 Car Rental</div>
                    <div style="font-size:16px; font-weight:700; margin-top:10px;">
                        <div style="margin-bottom: 12px;"><strong>Company:</strong> ${company}</div>
                        <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Pick-up:</strong><br>${pickupLoc}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${pickupDate} @ ${pickupTime}</span></div>
                        <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Drop-off:</strong><br>${dropoffLoc || pickupLoc}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${dropoffDate} @ ${dropoffTime}</span></div>
                        <span style="color: var(--accent); font-size:14px;"><strong>Ref:</strong> ${ref}</span>
                    </div>
                </div>`;
            }
        }
    });

    display.innerHTML = html;
    if(emptyState) emptyState.style.display = hasData ? 'none' : 'flex';
})};

function renderAccommodations() { safeRun('RenderAcc', () => {
    const filter = document.getElementById('family-selector')?.value || 'All';
    const today = new Date(); today.setHours(0,0,0,0);
    
    let htmlLA = '', htmlUtah = '', htmlVegas = '', htmlToday = '';

    vaultAndStaysData.forEach(cols => {
        if(cols.length < 2) return;

        const fam = cols[0].trim();
        const type = cols[1].trim().toLowerCase();

        if (type === 'stay' && (filter === 'All' || fam.toLowerCase() === filter.toLowerCase() || fam.toLowerCase() === 'everyone')) {
            const checkIn = cols[2]?.trim();
            const city = cols[3]?.trim();
            const address = escapeHTML(cols[4]?.trim());
            const checkOut = cols[5]?.trim();
            const link = escapeHTML(cols[6]?.trim());
            const imgUrl = escapeHTML(cols[7]?.trim());

            const headerBg = imgUrl ? `url('${imgUrl}') center/cover` : `var(--accent)`;
            const mapLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
            
            const ui = `
                <div class="admin-card" style="padding: 0; overflow: hidden; margin-bottom: 24px;">
                    <div style="height: 140px; background: ${headerBg}; display: flex; align-items: flex-end; padding: 20px;">
                        <h3 style="margin: 0; color: white; font-size: 24px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 900;">🏡 ${escapeHTML(fam)} Stay</h3>
                    </div>
                    <div style="padding: 20px;">
                        <div style="font-size: 14px; opacity: 0.6; font-weight: 700; margin-bottom: 15px;">📍 ${address}</div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.open('${mapLink}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px;">🚗 Drive</button>
                            ${link ? `<button onclick="window.open('${link}', '_blank')" class="action-btn" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>` : ''}
                        </div>
                    </div>
                </div>`;
                
            if(city.toLowerCase().includes('la')) htmlLA += ui;
            else if(city.toLowerCase().includes('utah')) htmlUtah += ui;
            else if(city.toLowerCase().includes('vegas')) htmlVegas += ui;

            if (checkIn && checkOut) {
                let sDate = new Date(parseDateTime(checkIn));
                let eDate = new Date(parseDateTime(checkOut));
                sDate.setHours(0,0,0,0);
                eDate.setHours(23,59,59,999);
                if (today >= sDate && today <= eDate) {
                    htmlToday += ui;
                }
            }
        }
    });

    const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA;
    const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
    const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
    const todayCard = document.getElementById('today-home-card'); if(todayCard) todayCard.innerHTML = htmlToday;
})};

function renderItinerary() { safeRun('RenderItin', () => {
    const filter = document.getElementById('family-selector')?.value || 'All';
    let hLA = '', hUtah = '', hVegas = '', hToday = '', hTomorrow = '';
    let lLA = '', lUtah = '', lVegas = '';
    let tCount = 0, tmCount = 0;
    const today = new Date(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); 
    
    itineraryData.forEach(cols => {
        if(cols.length >= 5) {
            const d = cols[0].trim(); const loc = cols[1].trim(); const act = cols[2].trim();
            const time = cols[3].trim(); const who = cols[4].trim(); 
            const addr = (cols.length >= 6) ? cols[5].trim() : '';
            
            if (filter === 'All' || who.toLowerCase() === filter.toLowerCase() || who.toLowerCase() === 'everyone') {
                const searchLoc = addr !== '' ? addr : `${act} ${loc}`;
                const mapLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(searchLoc);
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
                else if (loc.toLowerCase().includes('utah')) { if(d !== lUtah) { hUtah += `<div class="date-divider"><span class="sticky-date">${escapeHTML(
