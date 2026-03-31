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

const fetchWithTimeout = async (resource, options = {}) => {
    const { timeout = 4000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error("Bad Network Response");
    return response;
};

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

    const updateDOM = () => {
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
    };

    if (!document.startViewTransition) {
        updateDOM();
    } else {
        document.startViewTransition(() => updateDOM());
    }
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
        const response = await fetchWithTimeout('https://api.frankfurter.app/latest?from=GBP&to=USD', { timeout: 3000 });
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
    
    if(document.getElementById('clock-uk')) document.getElementById('clock-ukinnerText = ukTime;
    if(document.getElementById('clock-local')) document.getElementById('clock-local').innerText = ptTime;
})};

function saveTripSettings() { safeRun('SaveTrip', () => {
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
    updateTimeAndCountdown(); 
})};

// ==========================================
// 3. MASTER CLOUD DATA ENGINE (WITH OFFLINE MODE)
// ==========================================

// NEW: Manual Force Sync for the Admin Button
async function forceDataSync() { safeRunAsync('ForceSync', async () => {
    const btn = document.getElementById('btn-force-sync');
    if (btn) { btn.innerText = "⏳ Syncing..."; btn.style.opacity = "0.7"; }
    
    await loadAllData();
    
    if (btn) { 
        btn.innerText = "✅ Up to Date!"; 
        btn.style.opacity = "1";
        setTimeout(() => { btn.innerText = "⬇️ Pull Latest Data"; }, 3000);
    }
})};

async function loadAllData() {
    let itinData = '';
    let vData = '';

    try {
        const [itineraryRes, vaultRes] = await Promise.all([
            fetchWithTimeout(sheetUrl, { timeout: 4000 }),
            fetchWithTimeout(vaultUrl, { timeout: 4000 })
        ]);
        
        itinData = await itineraryRes.text();
        vData = await vaultRes.text();

        localStorage.setItem('offline_itinerary', itinData);
        localStorage.setItem('offline_vault', vData);

    } catch (e) { 
        console.warn("[OFFLINE MODE] Network slow/blocked. Bypassing fetch & loading backup..."); 
        
        itinData = localStorage.getItem('offline_itinerary') || '';
        vData = localStorage.getItem('offline_vault') || '';
        
        if (!itinData && !vData) {
            console.error("[OFFLINE MODE] No backup data found.");
            return;
        }
    }

    try {
        if (itinData) {
            const iRows = itinData.split('\n').slice(1);
            itineraryData = iRows.filter(r => r.trim() !== '');
            itineraryData.sort((a, b) => {
                const ca = a.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
                const cb = b.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
                if (ca.length < 5 || cb.length < 5) return 0;
                return parseDateTime(ca[0], ca[3]) - parseDateTime(cb[0], cb[3]);
            });
            
            itineraryData.forEach(row => {
                const col = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
                if (col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') {
                    sheetFamilies.add(col[4].trim());
                }
            });
        }

        if (vData) {
            const vRows = vData.split('\n').slice(1);
            vaultAndStaysData = vRows.filter(r => r.trim() !== '');
            vaultAndStaysData.forEach(row => {
                const col = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
                if (col.length > 0 && col[0].trim().toLowerCase() !== 'everyone') {
                    sheetFamilies.add(col[0].trim());
                }
            });
        }

        safeRun('PopulateDropdown', populateDropdown);
        safeRun('RenderItinerary', renderItinerary);
        safeRun('RenderVault', renderTravelVault);
        safeRun('RenderAcc', renderAccommodations);

        updateFamilyFilter();

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
        const ca = a.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
        const cb = b.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        return parseDateTime(ca[2]) - parseDateTime(cb[2]); 
    });

    sortedData.forEach(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
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

    vaultAndStaysData.forEach(row => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
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
    
    itineraryData.forEach(row => {
        const col = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
        if(col.length >= 5) {
            const d = col[0].trim(); const loc = col[1].trim(); const act = col[2].trim();
            const time = col[3].trim(); const who = col[4].trim(); 
            const addr = (col.length >= 6) ? col[5].trim() : '';
            
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
                else if (loc.toLowerCase().includes('utah')) { if(d !== lUtah) { hUtah += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lUtah = d; } hUtah += cardHtml; }
                else if (loc.toLowerCase().includes('vegas')) { if(d !== lVegas) { hVegas += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`; lVegas = d; } hVegas += cardHtml; }
                
                const isDateMatch = (s, target) => { let dt = new Date(parseDateTime(s)); return dt.toDateString() === target.toDateString(); };
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
})};

function updateFamilyFilter() { safeRun('UpdateFilter', () => {
    const sel = document.getElementById('family-selector');
    if(sel) { localStorage.setItem('savedFamilyFilter', sel.value); }
    
    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) {
        if (!sel || sel.value === 'All' || sel.value === 'Everyone') {
            greetingEl.innerHTML = "The USA 2026<br>Adventure";
        } else {
            greetingEl.innerHTML = "Welcome<br>" + escapeHTML(sel.value);
        }
    }

    renderItinerary(); 
    renderTravelVault();
    renderAccommodations();
})};


// ==========================================
// 5. WEATHER ENGINE (WITH LAG-FREE CACHING)
// ==========================================
const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
const getWeatherIcon = (c) => { 
    const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
    return m[c] || '🌤️'; 
};

function renderWeatherToDOM(d, fData, locName) {
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
}

async function fetchAndRenderWeather(lat, lon, fallbackName = null) {
    try { 
        const cachedData = JSON.parse(localStorage.getItem('weatherCache'));
        if (cachedData && (Date.now() - cachedData.timestamp < 1800000)) {
            renderWeatherToDOM(cachedData.current, cachedData.forecast, cachedData.locName);
            return; 
        }

        const [currentRes, forecastRes] = await Promise.all([
            fetchWithTimeout("https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&appid=" + W_API_KEY + "&units=metric", { timeout: 4000 }),
            fetchWithTimeout("https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&appid=" + W_API_KEY + "&units=metric", { timeout: 4000 })
        ]);
        
        const d = await currentRes.json();
        const fData = await forecastRes.json();
        const locName = fallbackName || d.name;

        localStorage.setItem('weatherCache', JSON.stringify({
            timestamp: Date.now(),
            current: d,
            forecast: fData,
            locName: locName
        }));

        renderWeatherToDOM(d, fData, locName);

    } catch (e) { 
        console.error("[MODULE ISOLATED] Weather Fetch Failed", e);
        
        const oldCache = JSON.parse(localStorage.getItem('weatherCache'));
        if (oldCache) {
            renderWeatherToDOM(oldCache.current, oldCache.forecast, oldCache.locName);
            if(document.getElementById('hw-desc')) document.getElementById('hw-desc').innerText = "Offline (Cached)";
        } else {
            if(document.getElementById('hw-loc')) document.getElementById('hw-loc').innerText = "📍 Offline"; 
        }
    }
}

async function initWeather() {
    const fallbackLat = 34.0522, fallbackLon = -118.2437;
    
    const cachedData = JSON.parse(localStorage.getItem('weatherCache'));
    if (cachedData && (Date.now() - cachedData.timestamp < 1800000)) {
        safeRunAsync('WeatherFetchCache', () => fetchAndRenderWeather(0, 0, null)); 
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { safeRunAsync('WeatherFetch', () => fetchAndRenderWeather(pos.coords.latitude, pos.coords.longitude)); },
            (err) => { safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles")); },
            { timeout: 4000, maximumAge: 60000 } 
        );
    } else {
        safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles"));
    }
}

// ==========================================
// 6. INITIALIZATION & PWA
// ==========================================
window.onload = () => {
    document.body.classList.add('theme-splash');
    
    safeRun('InitTheme', () => {
        applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
        document.body.classList.remove('theme-la', 'theme-utah', 'theme-vegas', 'theme-flights');
        document.body.classList.add('theme-splash');
        updateMetaThemeColor('splash');
    });
    
    safeRun('InitClocks', () => {
        updateTimeAndCountdown();
        setInterval(updateTimeAndCountdown, 60000); 
    });
    
    safeRun('InitWeather', initWeather);
    safeRunAsync('InitCurrency', initLiveCurrency); 
    safeRunAsync('InitDataEngine', loadAllData); 

    // NEW: Background refresh loops to keep data perfectly in sync
    setInterval(() => safeRunAsync('BackgroundDataSync', loadAllData), 600000); 
};

// NEW: Instantly pulls fresh data if you unlock your phone after being asleep
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        safeRunAsync('ForegroundDataSync', loadAllData);
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
}

function syncUpdates() {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.update(); });
    }
    alert("Updating..."); window.location.reload(true); 
}
