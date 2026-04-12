(() => {
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

    function setThemeMode(isDark) { safeRun('ThemeMode', () => {
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

    function openTab(pageId, buttonId = null) { safeRun('Navigation', () => {
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
        
        updateTimeAndCountdown();
    })};

    // ==========================================
    // SWIPE NAVIGATION ENGINE
    // ==========================================
    let touchstartX = 0;
    let touchendX = 0;
    const swipeThreshold = 50; 

    const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

    function handleSwipe() {
        const distance = touchendX - touchstartX;
        if (Math.abs(distance) < swipeThreshold) return; 

        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab || !tabOrder.includes(activeTab.id)) return; 

        const currentIndex = tabOrder.indexOf(activeTab.id);

        if (distance < 0) {
            if (currentIndex < tabOrder.length - 1) {
                const nextTab = tabOrder[currentIndex + 1];
                openTab(nextTab, 'nav-btn-' + nextTab);
            }
        } else {
            if (currentIndex > 0) {
                const prevTab = tabOrder[currentIndex - 1];
                openTab(prevTab, 'nav-btn-' + prevTab);
            }
        }
    }

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
            splashBtn.addEventListener('click', () => openTab(smartTab, smartNavBtn));
        }
    }

    // ==========================================
    // 2. DASHBOARD TOOLS
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
        
        const activeTab = document.querySelector('.tab-content.active')?.id || 'home';
        let localTz = 'America/Los_Angeles'; 
        let localTzLabel = '🇺🇸 Local (PT)';

        if (activeTab === 'utah') {
            localTz = 'America/Denver'; 
            localTzLabel = '🇺🇸 Local (MT)';
        }
        
        const ukTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(now);
        const localTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: localTz }).format(now);
        
        if(document.getElementById('clock-uk')) document.getElementById('clock-uk').innerText = ukTime;
        if(document.getElementById('clock-local')) document.getElementById('clock-local').innerText = localTime;
        if(document.getElementById('local-tz-label')) document.getElementById('local-tz-label').innerText = localTzLabel;
    })};

    function saveTripSettings() { safeRun('SaveTrip', () => {
        localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
        updateTimeAndCountdown(); 
    })};

    // ==========================================
    // 3. MASTER CLOUD DATA ENGINE 
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
            
            if (!itineraryRes.ok || !vaultRes.ok) throw new Error("Google Sheets error.");

            itinData = await itineraryRes.text();
            vData = await vaultRes.text();

            localStorage.setItem('offline_itinerary', itinData);
            localStorage.setItem('offline_vault', vData);

        } catch (e) { 
            console.warn("[OFFLINE MODE] Loading backup data..."); 
            itinData = localStorage.getItem('offline_itinerary') || '';
            vData = localStorage.getItem('offline_vault') || '';
            if (!itinData && !vData) return;
        }

        try {
            if (itinData) {
                itineraryData = parseCSV(itinData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
                itineraryData.sort((a, b) => {
                    if (a.length < 5 || b.length < 5) return 0;
                    return parseDateTime(a[0], a[3]) - parseDateTime(b[0], b[3]);
                });
                itineraryData.forEach(col => {
                    if (col.length >= 5 && col[4].trim().toLowerCase() !== 'everyone') sheetFamilies.add(col[4].trim());
                });
            }

            if (vData) {
                vaultAndStaysData = parseCSV(vData).slice(1).filter(r => r.length > 1 && r[0].trim() !== '');
                vaultAndStaysData.forEach(col => {
                    if (col.length > 0 && col[0].trim().toLowerCase() !== 'everyone') sheetFamilies.add(col[0].trim());
                });
            }

            safeRun('PopulateDropdown', populateDropdown);
            safeRun('RenderItinerary', renderItinerary);
            safeRun('RenderVault', renderTravelVault);
            safeRun('RenderAcc', renderAccommodations);
            
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

    async function preCacheImages() {
        if ('caches' in window) {
            try {
                const cache = await caches.open('holiday-planner-v2.1.7'); 
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
            } catch (e) {}
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

        const sortedData = [...vaultAndStaysData].sort((a,b) => parseDateTime(a[2]) - parseDateTime(b[2]));

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
                } else if (type === 'car') {
                    hasData = true;
                    html += `
                    <div class="admin-card" style="margin-bottom:24px; border-left: 5px solid var(--accent);">
                        <div style="font-size:11px; font-weight:900; opacity:0.5; text-transform:uppercase; letter-spacing: 0.5px;">🚗 Car Rental</div>
                        <div style="font-size:16px; font-weight:700; margin-top:10px;">
                            <div style="margin-bottom: 12px;"><strong>Company:</strong> ${escapeHTML(cols[4]?.trim())}</div>
                            <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Pick-up:</strong><br>${escapeHTML(cols[5]?.trim())}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${escapeHTML(cols[2]?.trim())} @ ${escapeHTML(cols[6]?.trim())}</span></div>
                            <div style="margin-bottom: 12px; padding-left: 10px; border-left: 2px solid var(--ios-grey);"><strong>Drop-off:</strong><br>${escapeHTML(cols[8]?.trim()) || escapeHTML(cols[5]?.trim())}<br><span style="font-size:13px; font-weight:600; opacity:0.8;">${escapeHTML(cols[3]?.trim())} @ ${escapeHTML(cols[7]?.trim())}</span></div>
                            <span style="color: var(--accent); font-size:14px;"><strong>Ref:</strong> ${escapeHTML(cols[9]?.trim())}</span>
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
                                <button class="action-btn link-btn" data-url="${mapLink}" style="flex: 1; padding: 12px; font-size: 14px;">🚗 Drive</button>
                                ${link ? `<button class="action-btn link-btn" data-url="${link}" style="flex: 1; padding: 12px; font-size: 14px; background: var(--ios-grey); color: var(--text);">🌐 Listing</button>` : ''}
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
                    if (today >= sDate && today <= eDate) htmlToday += ui;
                }
            }
        });

        const laCard = document.getElementById('la-home-card'); if(laCard) laCard.innerHTML = htmlLA;
        const utahCard = document.getElementById('utah-home-card'); if(utahCard) utahCard.innerHTML = htmlUtah;
        const vegasCard = document.getElementById('vegas-home-card'); if(vegasCard) vegasCard.innerHTML = htmlVegas;
        const todayCard = document.getElementById('today-home-card'); if(todayCard) todayCard.innerHTML = htmlToday;
    })};

    // FEATURE: Dynamic Task Completion Engine
    function renderItinerary() { safeRun('RenderItin', () => {
        const filter = document.getElementById('family-selector')?.value || 'All';
        const completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
        
        let hLA = '', hUtah = '', hVegas = '', hToday = '', hTomorrow = '';
        let cLA = '', cUtah = '', cVegas = '', cToday = '', cTomorrow = '';
        let lLA = '', lUtah = '', lVegas = ''; 
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
                    
                    // Create a unique hash for the task to save into localStorage
                    const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, '');
                    const isCompleted = completedTasks.includes(taskId);

                    let cardClass = isCompleted ? 'admin-card itin-card completed' : 'admin-card itin-card';
                    let badgeHtml = isCompleted ? `<span style="background: #34c759; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; color: white; box-shadow: 0 2px 10px rgba(52, 199, 89, 0.4);">✅ DONE</span>` : `<span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; color: var(--text);">${escapeHTML(who)}</span>`;

                    const cardHtml = `
                        <div class="${cardClass}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="text-align: left; transition: all 0.3s ease; cursor: pointer; padding: 20px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                                <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>
                                ${badgeHtml}
                            </div>
                            <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3; margin-bottom: 8px;">${escapeHTML(act)}</div>
                            <div style="font-size: 14px; font-weight: 700; opacity: 0.7; line-height: 1.5;">
                                📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 800;">Get Directions</a>
                                ${addressDisplayHtml}
                            </div>
                        </div>`;

                    // Helper to push html to the correct string (Active vs Completed)
                    const pushToView = (cVar, hVar, lastDateVar) => {
                        if (isCompleted) {
                            return { h: hVar, c: cVar + cardHtml, l: lastDateVar };
                        } else {
                            if (d !== lastDateVar) {
                                hVar += `<div class="date-divider"><span class="sticky-date">${escapeHTML(d)}</span></div>`;
                                lastDateVar = d;
                            }
                            hVar += cardHtml;
                            return { h: hVar, c: cVar, l: lastDateVar };
                        }
                    };

                    if (loc.toLowerCase().includes('la')) { 
                        const res = pushToView(cLA, hLA, lLA); hLA = res.h; cLA = res.c; lLA = res.l;
                    }
                    else if (loc.toLowerCase().includes('utah')) { 
                        const res = pushToView(cUtah, hUtah, lUtah); hUtah = res.h; cUtah = res.c; lUtah = res.l;
                    }
                    else if (loc.toLowerCase().includes('vegas')) { 
                        const res = pushToView(cVegas, hVegas, lVegas); hVegas = res.h; cVegas = res.c; lVegas = res.l;
                    }
                    
                    const isDateMatch = (s, target) => { let dt = new Date(parseDateTime(s)); return dt.toDateString() === target.toDateString(); };
                    if (isDateMatch(d, today)) { 
                        if (isCompleted) cToday += cardHtml; else hToday += cardHtml; 
                    } 
                    else if (isDateMatch(d, tomorrow)) { 
                        if (isCompleted) cTomorrow += cardHtml; else hTomorrow += cardHtml; 
                    }
                }
            }
        });
        
        // Helper to update DOM
        const updateSection = (id, html, cHtml) => {
            const mainEl = document.getElementById(id + '-itinerary');
            const compListEl = document.getElementById(id + '-completed-list');
            const compWrapEl = document.getElementById(id + '-completed-section');

            if (mainEl) mainEl.innerHTML = html || '<div class="empty-state"><span class="empty-icon">🏖️</span><div class="empty-text">No active plans</div></div>';
            if (compListEl && compWrapEl) {
                if (cHtml) {
                    compListEl.innerHTML = cHtml;
                    compWrapEl.style.display = 'block';
                } else {
                    compWrapEl.style.display = 'none';
                }
            }
        };

        updateSection('la', hLA, cLA);
        updateSection('utah', hUtah, cUtah);
        updateSection('vegas', hVegas, cVegas);
        updateSection('today', hToday, cToday);
        updateSection('tomorrow', hTomorrow, cTomorrow);
    })};

    function updateFamilyFilter() { safeRun('UpdateFilter', () => {
        const sel = document.getElementById('family-selector');
        if(sel) { localStorage.setItem('savedFamilyFilter', sel.value); }
        renderItinerary(); 
        renderTravelVault();
        renderAccommodations();
    })};


    // ==========================================
    // 5. WEATHER ENGINE
    // ==========================================
    const W_API_KEY = "4c00e61833ea94d3c4a1bff9d2c32969"; 
    const getWeatherIcon = (c) => { 
        const m = { '01d':'☀️', '01n':'🌙', '02d':'⛅', '02n':'☁️', '03d':'☁️', '03n':'☁️', '04d':'☁️', '04n':'☁️', '09d':'🌧️', '09n':'🌧️', '10d':'🌧️', '10n':'🌧️', '11d':'🌦️', '11n':'🌧️', '13d':'🌨️', '13n':'🌨️', '50d':'💨', '50n':'💨' }; 
        return m[c] || '🌤️'; 
    };

    function setWeatherCity(target) {
        document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-w-${target}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        const wDash = document.getElementById('WTH-dashboard');
        if (wDash) wDash.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span><div class="empty-text">Syncing Radar...</div></div>`;
        
        if (target === 'la') fetchAndRenderWeather(34.0522, -118.2437, "Los Angeles");
        else if (target === 'utah') fetchAndRenderWeather(37.0965, -113.5684, "Utah"); 
        else if (target === 'vegas') fetchAndRenderWeather(36.1699, -115.1398, "Las Vegas");
        else initLocalWeather(); 
    }

    function autoSetWeatherCity() {
        const now = new Date();
        const savedStart = localStorage.getItem('tripStartDate');
        let target = 'la'; 
        if (savedStart) {
            const tripDate = new Date(savedStart);
            if (now >= tripDate) target = 'local'; 
        }
        setWeatherCity(target);
    }

    async function fetchAndRenderWeather(lat, lon, fallbackName = null) {
        try { 
            const res = await fetch("https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&appid=" + W_API_KEY + "&units=metric"); 
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

            const fRes = await fetch("https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&appid=" + W_API_KEY + "&units=metric"); 
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

    async function initLocalWeather() {
        const fallbackLat = 34.0522, fallbackLon = -118.2437;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => { safeRunAsync('WeatherFetch', () => fetchAndRenderWeather(pos.coords.latitude, pos.coords.longitude, "Local GPS")); },
                (err) => { safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles")); },
                { timeout: 5000 } 
            );
        } else {
            safeRunAsync('WeatherFallback', () => fetchAndRenderWeather(fallbackLat, fallbackLon, "Los Angeles"));
        }
    }

    // ==========================================
    // 6. EVENT BINDING ENGINE & MODAL LOGIC
    // ==========================================
    let activeTaskIdToComplete = null;

    function openCompletionModal(taskId, taskName) {
        activeTaskIdToComplete = taskId;
        document.getElementById('modal-task-name').innerText = taskName;
        document.getElementById('modal-checkbox').checked = false;
        
        const confirmBtn = document.getElementById('btn-confirm-modal');
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.pointerEvents = 'none';

        const modal = document.getElementById('completion-modal');
        modal.style.display = 'flex';
        // Tiny timeout to allow display:flex to register before animating opacity
        setTimeout(() => modal.classList.add('active'), 10); 
    }

    function closeCompletionModal() {
        const modal = document.getElementById('completion-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300); // Wait for CSS transition
        activeTaskIdToComplete = null;
    }

    function bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.id.replace('nav-btn-', '');
                openTab(targetId, this.id);
            });
        });

        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.id.replace('btn-w-', '');
                setWeatherCity(targetId);
            });
        });

        document.querySelectorAll('.tip-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setTip(parseInt(this.dataset.tip), this);
            });
        });

        document.getElementById('home-weather-pill')?.addEventListener('click', () => openTab('weather-root'));
        document.getElementById('btn-show-today')?.addEventListener('click', () => switchDayView('today'));
        document.getElementById('btn-show-tomorrow')?.addEventListener('click', () => switchDayView('tomorrow'));
        document.getElementById('btn-open-admin')?.addEventListener('click', () => openTab('admin'));
        document.getElementById('btnLight')?.addEventListener('click', () => setThemeMode(false));
        document.getElementById('btnDark')?.addEventListener('click', () => setThemeMode(true));
        
        document.getElementById('btn-add-family')?.addEventListener('click', addCustomFamily);
        document.getElementById('btn-force-sync')?.addEventListener('click', forceDataSync);
        document.getElementById('btn-update-version')?.addEventListener('click', updateAppVersion);

        document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
        document.getElementById('bill-total')?.addEventListener('input', calculateTip);
        document.getElementById('split-ways')?.addEventListener('change', calculateTip);
        document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
        document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);

        // Modal Specific Events
        document.getElementById('modal-checkbox')?.addEventListener('change', function() {
            const btn = document.getElementById('btn-confirm-modal');
            if (this.checked) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });
        document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCompletionModal);
        document.getElementById('btn-confirm-modal')?.addEventListener('click', () => {
            if (activeTaskIdToComplete && document.getElementById('modal-checkbox').checked) {
                let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
                if (!completedTasks.includes(activeTaskIdToComplete)) {
                    completedTasks.push(activeTaskIdToComplete);
                    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
                }
                closeCompletionModal();
                renderItinerary(); // Instantly triggers UI to move the card to the bottom
            }
        });

        // Global Event Delegation for Cards
        document.body.addEventListener('click', (e) => {
            // Check if user clicked an active itinerary card
            const activeCard = e.target.closest('.itin-card:not(.completed)');
            if (activeCard) {
                if (e.target.tagName.toLowerCase() === 'a') return; // Ignore map links
                openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName);
                return;
            }

            // Check if user clicked a COMPLETED card (this lets them un-complete a mistake)
            const completedCard = e.target.closest('.itin-card.completed');
            if (completedCard) {
                if (e.target.tagName.toLowerCase() === 'a') return;
                let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
                completedTasks = completedTasks.filter(id => id !== completedCard.dataset.taskId);
                localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
                renderItinerary(); // Restore it back up top
                return;
            }

            // Check if user clicked a generated "Drive" or "Listing" button
            const linkBtn = e.target.closest('.link-btn');
            if (linkBtn && linkBtn.dataset.url) {
                window.open(linkBtn.dataset.url, '_blank');
            }
        });

        // Swipe Setup
        const mainContent = document.getElementById('content');
        if (mainContent) {
            mainContent.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
            mainContent.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleSwipe(); }, { passive: true });
        }
    }


    // ==========================================
    // 7. APP BOOTSTRAP 
    // ==========================================
    window.addEventListener('load', () => {
        document.body.classList.add('theme-splash');
        
        bindEvents();

        safeRun('InitTheme', () => {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            const savedTheme = localStorage.getItem('HolidayPlanner_Theme');
            
            const isDark = savedTheme !== null ? savedTheme === 'true' : prefersDark.matches;
            applyTheme(isDark);
            
            prefersDark.addEventListener('change', (e) => {
                if (localStorage.getItem('HolidayPlanner_Theme') === null) {
                    applyTheme(e.matches);
                }
            });

            document.body.classList.remove('theme-la', 'theme-utah', 'theme-vegas', 'theme-flights');
            document.body.classList.add('theme-splash');
            updateMetaThemeColor('splash');
        });
        
        safeRun('InitClocks', () => {
            updateTimeAndCountdown();
            setInterval(updateTimeAndCountdown, 60000); 
        });
        
        safeRun('InitWeather', autoSetWeatherCity);
        safeRunAsync('InitCurrency', initLiveCurrency); 
        safeRunAsync('InitDataEngine', loadAllData); 
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    }

    async function forceDataSync() {
        const btn = document.getElementById('btn-force-sync');
        if (btn) btn.innerText = "⏳ Syncing...";
        
        await safeRunAsync('InitDataEngine', loadAllData); 
        
        if (btn) {
            btn.innerText = "✅ Synced!";
            setTimeout(() => { btn.innerText = "☁️ Force Refresh Data"; }, 2000);
        }
    }

    function updateAppVersion() {
        if('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => { 
                for (let r of regs) r.update(); 
            });
        }
        alert("Flushing app cache. The page will now reload to pull the newest code.");
        window.location.reload(true);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log("App resumed: Pulling fresh data from cloud...");
            safeRunAsync('ResumeSync', loadAllData);
            updateTimeAndCountdown(); 
        }
    });
})();
