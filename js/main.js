import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud } from './api.js';

// THE FIX: ALL IMPORTS MATCH EXACTLY
import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, updateGreeting, saveTripSettings,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal,
    renderItinerary, renderTravelVault, renderAccommodations, handleFileUpload, renderWallet,
    openCompletionModal, closeCompletionModal, triggerConfetti, triggerEmojiRain, triggerHype,
    initWheel, spinRoulette, renderScoreboard, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openGateModal, closeGateModal, renderUpNext
} from './ui.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

export function openTab(pageId) {
    if (navigator.vibrate) navigator.vibrate(40); 
    document.querySelectorAll('.tab-content').forEach(tab => { tab.className = 'page tab-content'; });
    const targetPage = document.getElementById(pageId); if(targetPage) targetPage.classList.add('active', 'fade-pop');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-btn-' + (pageId==='flights'?'flights':pageId)).classList.add('active');
    const isDark = document.body.classList.contains('dark-mode');
    document.body.className = `${isDark ? 'dark-mode' : 'light-mode'} theme-${pageId}`;
    updateMetaThemeColor(pageId); updateTimeAndCountdown(); window.scrollTo(0,0);
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

function initPullToRefresh() {
    let pStart = 0; const spinner = document.getElementById('ptr-spinner');
    document.addEventListener('touchstart', e => { if (window.scrollY === 0) pStart = e.touches[0].clientY; }, {passive: true});
    document.addEventListener('touchend', e => {
        if (window.scrollY === 0 && pStart > 0) {
            if (e.changedTouches[0].clientY - pStart > 150) {
                if(spinner) spinner.classList.add('refreshing'); if (navigator.vibrate) navigator.vibrate(50);
                loadAllData().then(() => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); setTimeout(() => { if(spinner) spinner.classList.remove('refreshing');}, 1000); });
            }
        }
        pStart = 0;
    }, {passive: true});
}

function startNotificationEngine() {
    setInterval(async () => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const notified = await getVal('notifiedTasks') || [];
        const now = Date.now();
        
        if(!state.itineraryData) return;

        state.itineraryData.forEach(cols => {
            if(!cols || cols.length < 5) return;
            const taskId = btoa(encodeURIComponent(`${cols[0].trim()}-${cols[1].trim()}-${cols[2].trim()}-${cols[3].trim()}`)).replace(/=/g, '');
            if (notified.includes(taskId)) return;
            
            const taskTime = parseDateTime(cols[0].trim(), cols[3].trim());
            if (taskTime && taskTime > now && (taskTime - now) <= 1800000) { 
                new Notification('Upcoming Activity', { body: `${cols[3].trim()} - ${cols[2].trim()}`, icon: 'img/icon-192.png' });
                notified.push(taskId);
                setVal('notifiedTasks', notified);
            }
        });
        
        renderUpNext();
        
    }, 60000); 
}

function bindEvents() {
    
    document.getElementById('roulette-mode')?.addEventListener('change', initWheel);
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('trip-end-date')?.addEventListener('change', saveTripSettings);
    
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });

    document.body.addEventListener('click', async (e) => {

        const weatherBtn = e.target.closest('.weather-btn');
        if (weatherBtn) { setWeatherCity(weatherBtn.id.replace('btn-w-', '')); return; }
        if (e.target.closest('#home-weather-pill')) { openWeatherModal(); return; }
        if (e.target.closest('#btn-close-weather')) { closeWeatherModal(); return; }
        
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) { openTab(navBtn.id.replace('nav-btn-', '')); return; }
        
        const tipsBtn = e.target.closest('.tips-btn');
        if (tipsBtn) { openTipsModal(tipsBtn.dataset.city); return; }
        const tipsTabBtn = e.target.closest('.tips-tab-btn');
        if (tipsTabBtn) { 
            document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active')); 
            tipsTabBtn.classList.add('active'); renderTips(tipsTabBtn.dataset.cat); return; 
        }
        if (e.target.closest('#btn-close-tips')) { closeTipsModal(); return; }
        
        if (e.target.closest('#btn-open-admin')) { openTab('admin'); return; }
        if (e.target.closest('#btn-hype')) { triggerHype(); return; }
        if (e.target.closest('#btn-spin-roulette')) { spinRoulette(); return; }
        
        if (e.target.closest('#btn-reset-tally')) {
            if(confirm("Clear the Vegas scoreboard?")) {
                localStorage.removeItem('rouletteTallies');
                renderScoreboard();
            }
            return;
        }
        
        if (e.target.closest('#btn-enable-notifs')) {
            const btn = e.target.closest('#btn-enable-notifs');
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        btn.innerHTML = '✅ Notifications Enabled';
                        btn.style.backgroundColor = '#34c759';
                        btn.style.color = 'white';
                        btn.style.boxShadow = '0 4px 15px rgba(52, 199, 89, 0.4)';
                    } else alert('Notifications denied.');
                });
            } else {
                alert('Push notifications not supported on this browser.');
            }
            return;
        }
        
        const tipBtn = e.target.closest('.tip-btn');
        if (tipBtn) { setTip(parseInt(tipBtn.dataset.tip), tipBtn); return; }
        
        const splitBtn = e.target.closest('.split-btn');
        if (splitBtn) {
            document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active'));
            splitBtn.classList.add('active'); calculateTip(); return;
        }
        
        if (e.target.closest('#clear-usd')) { 
            const usdInput = document.getElementById('usd-input');
            if (usdInput) usdInput.value = '';
            convertCurrency(); return; 
        }
        
        if (e.target.closest('#btnLight')) { setThemeMode(false); return; }
        if (e.target.closest('#btnDark')) { setThemeMode(true); return; }
        if (e.target.closest('#btn-clear-families')) { clearCustomFamilies(); return; }
        
        if (e.target.closest('#btn-force-sync')) {
            const btn = e.target.closest('#btn-force-sync');
            btn.innerText = "⏳ Syncing..."; await loadAllData(); 
            populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderUpNext();
            btn.innerText = "✅ Synced!"; setTimeout(() => { btn.innerText = "☁️ Sync Data"; }, 2000); return;
        }
        
        if (e.target.closest('#btn-update-version')) {
            if('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => { for(let r of regs) r.update(); }); }
            window.location.reload(true); return;
        }
        
        if (e.target.closest('#hero-la')) { triggerEmojiRain('la'); return; }
        if (e.target.closest('#hero-utah')) { triggerEmojiRain('utah'); return; }
        if (e.target.closest('#hero-vegas')) { triggerEmojiRain('vegas'); return; }
        
        if (e.target.closest('#btn-close-stay')) { closeStayModal(); return; }
        if (e.target.closest('#btn-close-completion-x') || e.target.closest('#btn-cancel-modal')) { closeCompletionModal(); return; }
        
        if (e.target.closest('#btn-confirm-modal')) {
            const modal = document.getElementById('completion-modal');
            let completedTasks = await getVal('completedTasks') || []; completedTasks.push(modal.dataset.activeTaskId);
            await setVal('completedTasks', completedTasks); syncToCloud('completion', completedTasks); triggerConfetti(); closeCompletionModal(); renderItinerary(); renderUpNext(); return;
        }

        const editGateBtn = e.target.closest('.edit-gate-btn');
        if (editGateBtn) {
            e.stopPropagation(); 
            const flightId = editGateBtn.dataset.flightid;
            openGateModal(flightId);
            return;
        }

        if (e.target.closest('#btn-close-gate')) {
            closeGateModal();
            return;
        }

        if (e.target.closest('#btn-save-gate')) {
            const modal = document.getElementById('gate-modal');
            const flightId = modal.dataset.flightid;
            const term = document.getElementById('gate-input-term').value.trim();
            const gate = document.getElementById('gate-input-gate').value.trim();
            
            let finalString = "Check Board";
            if (term && gate) finalString = `Terminal ${term} - Gate ${gate}`;
            else if (term) finalString = `Terminal ${term}`;
            else if (gate) finalString = `Gate ${gate}`;
            
            if (!state.gateOverrides) state.gateOverrides = {};
            state.gateOverrides[flightId] = finalString;
            
            await setVal('gateOverrides', state.gateOverrides);
            syncToCloud('gateUpdate', state.gateOverrides);
            
            const gateText = document.getElementById(`gate-text-${flightId}`);
            if(gateText) gateText.innerText = finalString;
            
            renderTravelVault();
            closeGateModal();
            return;
        }

        const travelCard = e.target.closest('.flip-container');
        if (travelCard && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') { 
            travelCard.classList.toggle('is-flipped'); 
            if(navigator.vibrate) navigator.vibrate(20);
            return; 
        }

        const stayCard = e.target.closest('.stay-card');
        if (stayCard) { openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.map, stayCard.dataset.link, stayCard.dataset.img); return; }

        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName !== 'A') { openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName); return; }
        
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName !== 'A') {
            let tasks = await getVal('completedTasks') || []; tasks = tasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', tasks); renderItinerary(); renderUpNext(); return;
        }

        const linkBtn = e.target.closest('.link-btn');
        if (linkBtn && linkBtn.dataset.url) { window.open(linkBtn.dataset.url, '_blank'); return; }

        const deleteDocBtn = e.target.closest('.delete-doc-btn');
        if (deleteDocBtn) {
            e.preventDefault(); e.stopPropagation();
            if(confirm("Delete this document?")) {
                let docs = await getVal('offline_docs') || [];
                docs = docs.filter(d => d.id !== deleteDocBtn.dataset.id);
                await setVal('offline_docs', docs); renderWallet();
            } return;
        }
    });
}

window.forceAppUpdate = () => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); };

async function bootApp() {
    bindEvents();
    initSwipes();
    initPullToRefresh();
    
    const notifBtn = document.getElementById('btn-enable-notifs');
    if (notifBtn && 'Notification' in window && Notification.permission === 'granted') {
        notifBtn.innerHTML = '✅ Notifications Enabled';
        notifBtn.style.backgroundColor = '#34c759';
        notifBtn.style.color = 'white';
        notifBtn.style.boxShadow = '0 4px 15px rgba(52, 199, 89, 0.4)';
    }
    
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('HolidayPlanner_Theme');
    applyTheme(savedTheme !== null ? savedTheme === 'true' : prefersDark.matches);
    prefersDark.addEventListener('change', (e) => { if (localStorage.getItem('HolidayPlanner_Theme') === null) applyTheme(e.matches); });

    history.replaceState({ pageId: 'home' }, '', '#home');
    
    try { state.gateOverrides = await getVal('gateOverrides') || {}; } catch(e) { state.gateOverrides = {}; }
    
    loadAllData().then(() => {
        populateDropdown(); 
        renderItinerary(); 
        renderTravelVault(); 
        renderAccommodations(); 
        preCacheImages(); 
        renderWallet();
        renderUpNext();
    }).catch(e => console.error("Data load failed:", e));
    
    initLiveCurrency(); 
    updateTimeAndCountdown(); 
    initWeatherPill();
    
    if (document.getElementById('roulette-wheel')) initWheel();
    
    startNotificationEngine();
}

function runBoot() {
    if (window.appBooted) return;
    window.appBooted = true;
    bootApp();
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', runBoot); } else { runBoot(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.error(e));
