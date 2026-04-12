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
                    if (col.length > 0 && col[0].trim().toLowerCase() !== 'everyone') sheet
