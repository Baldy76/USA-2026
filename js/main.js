import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud } from './api.js';

import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, updateGreeting, saveTripSettings,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal,
    renderItinerary, renderTravelVault, renderAccommodations, handleFileUpload, renderWallet,
    openCompletionModal, closeCompletionModal, triggerConfetti, triggerEmojiRain, triggerHype,
    initWheel, spinRoulette, renderScoreboard, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openGateModal, closeGateModal, renderUpNext, renderAnchor,
    openQuoteModal, closeQuoteModal, submitNewQuote // NEW
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
    document.querySelectorAll('.city-hero').forEach(h => h.style.backgroundPosition = 'center 0px');
}

function bindEvents() {
    document.body.addEventListener('click', async (e) => {
        
        // NEW: QUOTE VAULT CLICKERS
        const quoteBtn = e.target.closest('.open-quote-btn');
        if (quoteBtn) { openQuoteModal(quoteBtn.dataset.location); return; }
        if (e.target.closest('#btn-close-quote')) { closeQuoteModal(); return; }
        if (e.target.closest('#btn-save-quote')) { submitNewQuote(); return; }

        if (e.target.closest('#btn-drop-anchor')) {
            const btn = e.target.closest('#btn-drop-anchor');
            btn.innerHTML = `<span style="font-size: 14px; font-weight: 900; color: white;">Locking GPS...</span>`;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    localStorage.setItem('carAnchor', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, timestamp: Date.now() }));
                    if(navigator.vibrate) navigator.vibrate([30, 50, 30]); triggerConfetti(); renderAnchor();
                }, (err) => { alert("Check GPS permissions!"); renderAnchor(); }, { enableHighAccuracy: true, timeout: 10000 });
            } return;
        }
        if (e.target.closest('#btn-find-car')) {
            const btn = e.target.closest('#btn-find-car');
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${btn.dataset.lat},${btn.dataset.lon}&travelmode=walking`, '_blank'); return;
        }
        if (e.target.closest('#btn-clear-anchor')) { e.stopPropagation(); if(confirm("Pull up anchor?")) { localStorage.removeItem('carAnchor'); renderAnchor(); } return; }
        
        const weatherBtn = e.target.closest('.weather-btn');
        if (weatherBtn) { setWeatherCity(weatherBtn.id.replace('btn-w-', '')); return; }
        if (e.target.closest('#home-weather-pill')) { openWeatherModal(); return; }
        if (e.target.closest('#btn-close-weather')) { closeWeatherModal(); return; }
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) { openTab(navBtn.id.replace('nav-btn-', '')); return; }
        const tipsBtn = e.target.closest('.tips-btn');
        if (tipsBtn) { openTipsModal(tipsBtn.dataset.city); return; }
        if (e.target.closest('#btn-close-tips')) { closeTipsModal(); return; }
        if (e.target.closest('#btn-hype')) { triggerHype(); return; }
        if (e.target.closest('#btn-spin-roulette')) { spinRoulette(); return; }
        if (e.target.closest('#btn-open-admin')) { openTab('admin'); return; }
        if (e.target.closest('#btn-close-stay')) { closeStayModal(); return; }
        if (e.target.closest('#btn-close-completion-x') || e.target.closest('#btn-cancel-modal')) { closeCompletionModal(); return; }
        if (e.target.closest('#btn-close-gate')) { closeGateModal(); return; }
        
        const travelCard = e.target.closest('.flip-container');
        if (travelCard && !e.target.closest('.edit-gate-btn')) { travelCard.classList.toggle('is-flipped'); return; }
        
        const stayCard = e.target.closest('.stay-card');
        if (stayCard) { openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.map, stayCard.dataset.link, stayCard.dataset.img); return; }
        
        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard) { openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName); return; }
    });
}

async function bootApp() {
    bindEvents();
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') !== null ? localStorage.getItem('HolidayPlanner_Theme') === 'true' : prefersDark.matches);
    loadAllData().then(() => {
        populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderWallet(); renderUpNext(); renderAnchor();
    });
    setInterval(updateTimeAndCountdown, 60000); updateTimeAndCountdown(); initLiveCurrency();
}

document.addEventListener('DOMContentLoaded', bootApp);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
