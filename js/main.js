import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud } from './api.js';

import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, saveTripSettings,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal,
    renderItinerary, renderTravelVault, renderAccommodations, handleFileUpload, renderWallet,
    openCompletionModal, closeCompletionModal, triggerConfetti, triggerEmojiRain, triggerHype,
    initWheel, spinRoulette, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openTravelModal, closeTravelModal
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

function bindEvents() {
    
    document.getElementById('roulette-mode')?.addEventListener('change', initWheel);
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    
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
        
        const tipBtn = e.target.closest('.tip-btn');
        if (tipBtn) { setTip(parseInt(tipBtn.dataset.tip), tipBtn); return; }
        
        if (e.target.closest('#btnLight')) { setThemeMode(false); return; }
        if (e.target.closest('#btnDark')) { setThemeMode(true); return; }
        if (e.target.closest('#btn-clear-families')) { clearCustomFamilies(); return; }
        
        if (e.target.closest('#btn-force-sync')) {
            const btn = e.target.closest('#btn-force-sync');
            btn.innerText = "⏳ Syncing..."; await loadAllData(); 
            populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages();
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
        if (e.target.closest('#btn-close-travel')) { closeTravelModal(); return; }
        if (e.target.closest('#btn-close-completion-x') || e.target.closest('#btn-cancel-modal')) { closeCompletionModal(); return; }
        
        if (e.target.closest('#btn-confirm-modal')) {
            const modal = document.getElementById('completion-modal');
            let completedTasks = await getVal('completedTasks') || []; completedTasks.push(modal.dataset.activeTaskId);
            await setVal('completedTasks', completedTasks); syncToCloud('completion', completedTasks); triggerConfetti(); closeCompletionModal(); renderItinerary(); return;
        }

        const editGateBtn = e.target.closest('.edit-gate-btn');
        if (editGateBtn) {
            const flightId = editGateBtn.dataset.flightid;
            const newGate = prompt("Enter new Terminal / Gate info:");
            if (newGate !== null && newGate.trim() !== "") {
                if (!state.gateOverrides) state.gateOverrides = {};
                state.gateOverrides[flightId] = newGate.trim();
                await setVal('gateOverrides', state.gateOverrides);
                syncToCloud('gateUpdate', state.gateOverrides);
                const gateText = document.getElementById('modal-gate-text');
                if(gateText) gateText.innerText = newGate.trim();
                renderTravelVault(); 
            } return;
        }

        const travelCard = e.target.closest('.travel-card');
        if (travelCard && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') { openTravelModal(travelCard.dataset); return; }

        const stayCard = e.target.closest('.stay-card');
        if (stayCard) { openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.img, stayCard.dataset.link); return; }

        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName !== 'A') { openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName); return; }
        
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName !== 'A') {
            let tasks = await getVal('completedTasks') || []; tasks = tasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', tasks); renderItinerary(); return;
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

window.forceAppUpdate = () => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); };

async function bootApp() {
    bindEvents();
    initSwipes();
    initPullToRefresh();
    
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
    }).catch(e => console.error("Data load failed:", e));
    
    initLiveCurrency(); 
    updateTimeAndCountdown(); 
    initWeatherPill();
    
    // Initialize Vegas Wheel if it exists on DOM
    if (document.getElementById('roulette-wheel')) initWheel();
}

function runBoot() {
    if (window.appBooted) return;
    window.appBooted = true;
    bootApp();
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', runBoot); } else { runBoot(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.error(e));
