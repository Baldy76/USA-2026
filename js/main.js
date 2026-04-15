import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages } from './api.js';
import { 
    renderItinerary, renderTravelVault, renderAccommodations, shareDay, 
    openCompletionModal, closeCompletionModal, applyTheme, setThemeMode, updateMetaThemeColor,
    switchDayView, convertCurrency, 
    setTip, calculateTip, 
    populateDropdown, clearCustomFamilies, updateFamilyFilter,
    setWeatherCity, autoSetWeatherCity, updateTimeAndCountdown, saveTripSettings,
    handleFileUpload, renderWallet, 
    triggerConfetti, triggerEmojiRain, triggerHype, spinRoulette,
    openTipsModal, closeTipsModal, renderTips,
    openStayModal, closeStayModal // NEW MODAL IMPORTS
} from './ui.js';
import { syncToCloud } from './api.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner').style.display = 'flex';
});

export function openTab(pageId, isPopState = false) {
    if (navigator.vibrate) navigator.vibrate(40); 
    const activeTab = document.querySelector('.tab-content.active'); let animClass = 'fade-pop'; 
    if (activeTab && tabOrder.includes(activeTab.id) && tabOrder.includes(pageId)) {
        const curIdx = tabOrder.indexOf(activeTab.id); const newIdx = tabOrder.indexOf(pageId);
        animClass = newIdx > curIdx ? 'slide-right' : 'slide-left';
    }
    
    document.querySelectorAll('.tab-content').forEach(tab => { tab.className = 'page tab-content'; });
    const targetPage = document.getElementById(pageId); if(targetPage) targetPage.classList.add('active', animClass);
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('nav-btn-' + pageId); if(activeBtn) activeBtn.classList.add('active');
    
    const isDark = document.body.classList.contains('dark-mode');
    document.body.className = `${isDark ? 'dark-mode' : 'light-mode'} theme-${pageId}`;
    
    updateMetaThemeColor(pageId); updateTimeAndCountdown(); window.scrollTo(0,0); 
    if (!isPopState) history.pushState({ pageId: pageId }, '', `#${pageId}`);
}

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.pageId) openTab(event.state.pageId, true); else openTab('home', true);
});

function initPullToRefresh() {
    let pStart = 0; const spinner = document.getElementById('ptr-spinner');
    document.addEventListener('touchstart', e => { if (window.scrollY === 0) pStart = e.touches[0].clientY; }, {passive: true});
    document.addEventListener('touchend', e => {
        if (window.scrollY === 0 && pStart > 0) {
            if (e.changedTouches[0].clientY - pStart > 150) {
                spinner.classList.add('refreshing'); if (navigator.vibrate) navigator.vibrate(50);
                loadAllData().then(() => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); setTimeout(() => spinner.classList.remove('refreshing'), 1000); });
            }
        }
        pStart = 0;
    }, {passive: true});
}

function initSwipes() {
    let touchstartX = 0; let touchendX = 0; const mainContent = document.getElementById('content'); if (!mainContent) return;
    mainContent.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
    mainContent.addEventListener('touchend', e => { 
        touchendX = e.changedTouches[0].screenX; const dist = touchendX - touchstartX; if (Math.abs(dist) < 60) return; 
        const activeTab = document.querySelector('.tab-content.active'); if (!activeTab || !tabOrder.includes(activeTab.id)) return; 
        const currentIndex = tabOrder.indexOf(activeTab.id);
        if (dist < 0 && currentIndex < tabOrder.length - 1) openTab(tabOrder[currentIndex + 1]); 
        else if (dist > 0 && currentIndex > 0) openTab(tabOrder[currentIndex - 1]); 
    }, { passive: true });
}

function startNotificationEngine() {
    setInterval(async () => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const notified = await getVal('notifiedTasks') || [];
        const now = Date.now();
        
        state.itineraryData.forEach(cols => {
            if(cols.length < 5) return;
            const taskId = btoa(encodeURIComponent(`${cols[0].trim()}-${cols[1].trim()}-${cols[2].trim()}-${cols[3].trim()}`)).replace(/=/g, '');
            if (notified.includes(taskId)) return;
            
            const taskTime = parseDateTime(cols[0], cols[3]);
            if (taskTime > now && (taskTime - now) <= 1800000) { 
                new Notification('Upcoming Activity', { body: `${cols[3].trim()} - ${cols[2].trim()}`, icon: 'img/icon-192.png' });
                notified.push(taskId);
                setVal('notifiedTasks', notified);
            }
        });
    }, 60000); 
}

function bindEvents() {
    
    const loginSelector = document.getElementById('login-selector');
    const splashGoBtn = document.getElementById('splash-go-btn');

    if (loginSelector && splashGoBtn) {
        const savedUser = localStorage.getItem('appUser');
        if (savedUser) {
            loginSelector.value = savedUser;
            splashGoBtn.innerText = `Let's go, ${savedUser}! ✈️`;
            splashGoBtn.disabled = false;
            splashGoBtn.style.opacity = '1';
        }

        loginSelector.addEventListener('change', function() {
            const userName = this.value;
            localStorage.setItem('appUser', userName);

            splashGoBtn.innerText = `Let's go, ${userName}! ✈️`;
            splashGoBtn.disabled = false;
            splashGoBtn.style.opacity = '1';

            let familyName = userName;

            const famSel = document.getElementById('family-selector');
            if (famSel) {
                let customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
                if (!customFamilies.includes(familyName) && familyName !== 'All') {
                    customFamilies.push(familyName);
                    localStorage.setItem('customFamilies', JSON.stringify(customFamilies));
                    populateDropdown();
                }
                famSel.value = familyName;
                updateFamilyFilter();
            }
        });
    }

    document.getElementById('splash-go-btn')?.addEventListener('click', () => openTab('home'));
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', function() { openTab(this.id.replace('nav-btn-', '')); }));
    document.getElementById('btn-install-app')?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') document.getElementById('install-banner').style.display = 'none';
            deferredPrompt = null;
        }
    });

    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    
    const notifBtn = document.getElementById('btn-enable-notifs');
    if (notifBtn) {
        if ('Notification' in window && Notification.permission === 'granted') {
            notifBtn.style.backgroundColor = '#34c759'; 
            notifBtn.style.color = 'white';
            notifBtn.innerText = '✅ Notifications Enabled';
        }
        notifBtn.addEventListener('click', async function() {
            if (!('Notification' in window)) { alert("Your browser does not support notifications."); return; }
            if (Notification.permission === 'granted') { alert("Notifications are already enabled!"); return; }
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                this.style.backgroundColor = '#34c759';
                this.style.color = 'white';
                this.innerText = '✅ Notifications Enabled';
                if(navigator.vibrate) navigator.vibrate([50, 50]);
            } else { alert("Notification permission denied by your browser settings."); }
        });
    }

    document.getElementById('btn-share-today')?.addEventListener('click', () => shareDay('today-itinerary', "Today's"));
    document.getElementById('btn-share-tomorrow')?.addEventListener('click', () => shareDay('tomorrow-itinerary', "Tomorrow's"));
    document.getElementById('btn-show-today')?.addEventListener('click', () => switchDayView('today'));
    document.getElementById('btn-show-tomorrow')?.addEventListener('click', () => switchDayView('tomorrow'));
    document.getElementById('btn-open-admin')?.addEventListener('click', () => openTab('admin'));
    document.getElementById('home-weather-pill')?.addEventListener('click', () => openTab('weather-root'));
    
    document.getElementById('btn-hype')?.addEventListener('click', triggerHype);
    document.getElementById('btn-spin-roulette')?.addEventListener('click', spinRoulette);
    document.getElementById('hero-la')?.addEventListener('click', () => triggerEmojiRain('la'));
    document.getElementById('hero-utah')?.addEventListener('click', () => triggerEmojiRain('utah'));
    document.getElementById('hero-vegas')?.addEventListener('click', () => triggerEmojiRain('vegas'));

    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.querySelectorAll('.tip-btn').forEach(btn => { btn.addEventListener('click', function() { setTip(parseInt(this.dataset.tip), this); }); });

    document.querySelectorAll('.tips-btn').forEach(btn => {
        btn.addEventListener('click', function() { openTipsModal(this.dataset.city); });
    });
    document.querySelectorAll('.tips-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if(navigator.vibrate) navigator.vibrate(20);
            document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderTips(this.dataset.cat);
        });
    });
    
    // MAC CLOSE BUTTON LISTENERS
    document.getElementById('btn-close-tips')?.addEventListener('click', closeTipsModal);
    document.getElementById('btn-close-stay')?.addEventListener('click', closeStayModal);
    document.getElementById('btn-close-completion-x')?.addEventListener('click', closeCompletionModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCompletionModal);

    document.getElementById('btn-clear-families')?.addEventListener('click', clearCustomFamilies);

    document.getElementById('btnLight')?.addEventListener('click', () => setThemeMode(false));
    document.getElementById('btnDark')?.addEventListener('click', () => setThemeMode(true));
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.querySelectorAll('.weather-btn').forEach(btn => { btn.addEventListener('click', function() { setWeatherCity(this.id.replace('btn-w-', '')); }); });

    document.getElementById('btn-force-sync')?.addEventListener('click', async function() {
        this.innerText = "⏳ Syncing..."; await loadAllData(); 
        populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages();
        this.innerText = "✅ Synced!"; setTimeout(() => { this.innerText = "☁️ Force Refresh Data"; }, 2000);
    });
    
    document.getElementById('btn-update-version')?.addEventListener('click', () => {
        if('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => { for(let r of regs) r.update(); }); }
        alert("Flushing app cache. The page will reload."); window.location.reload(true);
    });
    
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal');
        if(this.checked) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; } 
        else { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    });
    
    document.getElementById('btn-confirm-modal')?.addEventListener('click', async () => {
        const modal = document.getElementById('completion-modal');
        if (document.getElementById('modal-checkbox').checked) {
            let completedTasks = await getVal('completedTasks') || [];
            completedTasks.push(modal.dataset.activeTaskId);
            await setVal('completedTasks', completedTasks);
            syncToCloud('completion', completedTasks); 
            
            triggerConfetti(); 
            closeCompletionModal(); renderItinerary(); 
        }
    });

    document.body.addEventListener('click', async (e) => {
        // Handle Opening Stay Modals
        const stayCard = e.target.closest('.stay-card');
        if (stayCard) {
            openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.map, stayCard.dataset.link, stayCard.dataset.img);
            return;
        }

        // Handle Itinerary Completions
        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName.toLowerCase() !== 'a') return openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName);
        
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName.toLowerCase() !== 'a') {
            let completedTasks = await getVal('completedTasks') || [];
            completedTasks = completedTasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', completedTasks); 
            syncToCloud('completion', completedTasks);
            renderItinerary();
        }

        const linkBtn = e.target.closest('.link-btn');
        if (linkBtn && linkBtn.dataset.url) window.open(linkBtn.dataset.url, '_blank');

        const deleteDocBtn = e.target.closest('.delete-doc-btn');
        if (deleteDocBtn) {
            e.preventDefault(); e.stopPropagation();
            if(confirm("Delete this document?")) {
                let docs = await getVal('offline_docs') || [];
                docs = docs.filter(d => d.id !== deleteDocBtn.dataset.id);
                await setVal('offline_docs', docs);
                renderWallet();
            }
        }
    });

    window.addEventListener('offline', () => document.getElementById('offline-banner').classList.add('active'));
    window.addEventListener('online', () => {
        document.getElementById('offline-banner').classList.remove('active');
        loadAllData().then(() => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); }); 
    });
}

window.addEventListener('load', async () => {
    bindEvents(); initSwipes(); initPullToRefresh();
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('HolidayPlanner_Theme');
    applyTheme(savedTheme !== null ? savedTheme === 'true' : prefersDark.matches);
    prefersDark.addEventListener('change', (e) => { if (localStorage.getItem('HolidayPlanner_Theme') === null) applyTheme(e.matches); });

    history.replaceState({ pageId: 'splash' }, '', '#splash');
    
    await loadAllData();
    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderWallet();
    
    initLiveCurrency(); autoSetWeatherCity(); updateTimeAndCountdown();
    
    setInterval(updateTimeAndCountdown, 60000);
    startNotificationEngine(); 
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.error(e));
