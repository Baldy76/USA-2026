import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud, deleteQuoteFromSheet } from './api.js';

import { applyTheme, setThemeMode, updateMetaThemeColor } from './core/theme.js';
import { updateTimeAndCountdown, updateGreeting, renderUpNext } from './core/clock.js';
import { triggerConfetti, triggerEmojiRain, triggerJackpotMode } from './core/animations.js';

import { populateDropdown, clearCustomFamilies, updateFamilyFilter, saveTripSettings } from './ui.js';

import { renderItinerary, openCompletionModal, closeCompletionModal } from './features/itinerary.js';
import { renderTravelVault, renderAccommodations, openStayModal, closeStayModal, openGateModal, closeGateModal, renderAnchor } from './features/travel.js';
import { openTipsModal, closeTipsModal, renderTips, openVegasFoodModal, closeVegasFoodModal, renderVegasFoodList, openNavChoiceModal, closeNavChoiceModal } from './features/guides.js';
import { openQuoteModal, closeQuoteModal, submitNewQuote, openManageQuotesModal, closeManageQuotesModal, renderAdminQuotes } from './features/quotes.js';
import { handleFileUpload, renderWallet, openLightbox, closeLightbox } from './features/wallet.js';
import { checkMorningBriefing, closeMorningBriefing, openMorningBriefing } from './features/briefing.js';

import { convertCurrency, setTip, calculateTip } from './features/tools.js';
import { initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal } from './features/weather.js';
import { initWheel, spinRoulette, renderScoreboard, resetRouletteScores } from './features/roulette.js';
import { renderMeetupBoard, openMeetupModal, closeMeetupModal, submitMeetup, clearActiveMeetup } from './features/meetup.js';
import { openChecklistModal, closeChecklistModal, toggleChecklistItem, resetChecklist } from './features/checklist.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];
const cheekyMessages = ["Bribing the pit boss...", "Fueling the jet...", "Locating Dave's wallet...", "Checking trail maps...", "Mixing the margaritas...", "Packing the bags...", "Hiding from the paparazzi..."];

export function openTab(pageId) {
    if (navigator.vibrate) navigator.vibrate(40); 
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        if (modal.style.display === 'flex' || modal.classList.contains('active')) {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
        }
    });
    document.querySelectorAll('.tab-content').forEach(tab => { tab.className = 'page tab-content'; });
    const targetPage = document.getElementById(pageId); if(targetPage) targetPage.classList.add('active', 'fade-pop');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-btn-' + (pageId==='flights'?'flights':pageId)).classList.add('active');
    const isDark = document.body.classList.contains('dark-mode');
    document.body.className = `${isDark ? 'dark-mode' : 'light-mode'} theme-${pageId}`;
    updateMetaThemeColor(pageId); updateTimeAndCountdown(); window.scrollTo(0,0);
}

// FEATURE: Handled Splash Logic inside the module to avoid race conditions
function handleSplashLogic() {
    const splash = document.getElementById('splash');
    const loginSelector = document.getElementById('login-selector');
    const splashGoBtn = document.getElementById('splash-go-btn');
    
    const savedUser = localStorage.getItem('appUser');
    if (savedUser) {
        loginSelector.style.display = 'none';
        splashGoBtn.innerText = `Let's go, ${savedUser}! ✈️`;
        splashGoBtn.style.display = 'block';
    }

    loginSelector.addEventListener('change', function() {
        const userName = this.value;
        localStorage.setItem('appUser', userName);
        loginSelector.style.display = 'none';
        splashGoBtn.innerText = `Let's go, ${userName}! ✈️`;
        splashGoBtn.style.display = 'block';
        updateFamilyFilter(); 
    });

    splashGoBtn.addEventListener('click', () => {
        splash.style.pointerEvents = 'none';
        splash.style.opacity = '0';
        setTimeout(() => { 
            splash.classList.remove('active'); splash.style.display = 'none'; 
            checkMorningBriefing();
        }, 300);
    });
}

function initPullToRefresh() {
    let pStart = 0; const spinner = document.getElementById('ptr-spinner');
    document.addEventListener('touchstart', e => { if (window.scrollY === 0) pStart = e.touches[0].clientY; }, {passive: true});
    document.addEventListener('touchend', e => {
        if (window.scrollY === 0 && pStart > 0) {
            if (e.changedTouches[0].clientY - pStart > 150) {
                document.getElementById('sync-text').innerText = cheekyMessages[Math.floor(Math.random() * cheekyMessages.length)];
                if(spinner) spinner.classList.add('refreshing'); if (navigator.vibrate) navigator.vibrate(50);
                loadAllData().then(() => { 
                    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); 
                    renderMeetupBoard(); renderScoreboard();
                    setTimeout(() => { if(spinner) spinner.classList.remove('refreshing');}, 1000); 
                });
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
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('trip-end-date')?.addEventListener('change', saveTripSettings);
    
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });

    document.body.addEventListener('click', async (e) => {
        if (e.target.closest('#dual-clocks')) {
            window.clockClicks = (window.clockClicks || 0) + 1;
            if (window.clockClicks >= 5) { window.clockClicks = 0; triggerJackpotMode(); }
            setTimeout(() => window.clockClicks = 0, 2000);
        }
        if (e.target.closest('.disney-app-btn')) { window.location.href = 'https://disneyland.disney.go.com/'; return; }
        if (e.target.closest('#btn-close-nav-choice')) { closeNavChoiceModal(); return; }
        if (e.target.closest('.nav-trigger-btn')) {
            const btn = e.target.closest('.nav-trigger-btn');
            openNavChoiceModal(btn.dataset.query, null, null, btn.dataset.loc || '');
            return;
        }
        if (e.target.closest('#btn-find-car')) {
            const btn = e.target.closest('#btn-find-car');
            openNavChoiceModal(null, btn.dataset.lat, btn.dataset.lon, '');
            return;
        }
        if (e.target.closest('#btn-nav-google') || e.target.closest('#btn-nav-waze') || e.target.closest('#btn-nav-uber') || e.target.closest('#btn-nav-alltrails')) {
            const btnId = e.target.closest('button').id;
            const modal = document.getElementById('nav-choice-modal');
            const q = modal.dataset.query; const lat = modal.dataset.lat; const lon = modal.dataset.lon;
            let url = '';
            const encodedQ = encodeURIComponent(q || '');
            if (btnId === 'btn-nav-waze') {
                if (lat && lon) url = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
                else url = `https://waze.com/ul?q=${encodedQ}&navigate=yes`;
            } else if (btnId === 'btn-nav-google') {
                if (lat && lon) url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                else url = `https://www.google.com/maps/dir/?api=1&destination=${encodedQ}`;
            } else if (btnId === 'btn-nav-uber') {
                url = `https://m.uber.com/ul/?action=setPickup&dropoff[query]=${encodedQ}`;
            } else if (btnId === 'btn-nav-alltrails') {
                url = `https://www.alltrails.com/search?q=${encodedQ}`;
            }
            if (url) window.location.href = url;
            closeNavChoiceModal(); return;
        }
        const linkBtn = e.target.closest('.link-btn');
        if (linkBtn && linkBtn.dataset.url) { window.location.href = linkBtn.dataset.url; return; }
        if (e.target.closest('#btn-manual-briefing')) { openMorningBriefing(); return; }
        if (e.target.closest('#btn-close-briefing')) { closeMorningBriefing(); return; }
        if (e.target.closest('#btn-vegas-food')) { openVegasFoodModal(); return; }
        if (e.target.closest('#btn-close-vegas-food')) { closeVegasFoodModal(); return; }
        const vfBtn = e.target.closest('.vegas-food-tab-btn');
        if (vfBtn) { 
            document.querySelectorAll('.vegas-food-tab-btn').forEach(b => b.classList.remove('active')); 
            vfBtn.classList.add('active'); renderVegasFoodList(vfBtn.dataset.cat); return; 
        }
        if (e.target.closest('.wallet-doc-link')) { e.preventDefault(); openLightbox(e.target.closest('.wallet-doc-link').dataset.src); return; }
        if (e.target.closest('#btn-close-lightbox') || e.target.id === 'lightbox-modal') { closeLightbox(); return; }
        if (e.target.closest('#copy-addr-btn')) {
            const btn = e.target.closest('#copy-addr-btn'); const addr = btn.dataset.addr;
            if(navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(addr); } else {
                const textArea = document.createElement("textarea"); textArea.value = addr; document.body.appendChild(textArea); textArea.focus(); textArea.select();
                try { document.execCommand('copy'); } catch(err) {} document.body.removeChild(textArea);
            }
            const originalHtml = btn.innerHTML; btn.innerHTML = `✅ Copied!`;
            setTimeout(() => { btn.innerHTML = originalHtml; }, 2000); return;
        }
        if (e.target.closest('#btn-reset-checklist')) { resetChecklist(); return; }
        if (e.target.closest('#btn-open-checklist')) { openChecklistModal(); return; }
        if (e.target.closest('#btn-close-checklist')) { closeChecklistModal(); return; }
        if (e.target.closest('.checklist-item')) { toggleChecklistItem(e.target.closest('.checklist-item').dataset.id); return; }
        if (e.target.closest('#btn-close-urgent')) {
            document.getElementById('urgent-alert-overlay').style.display = 'none';
            const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
            if (meetups.length > 0) { const latest = meetups[meetups.length - 1]; await setVal('lastSeenMeetupId', btoa(latest[1] + latest[2]).substring(0, 12)); }
            renderMeetupBoard(); return;
        }
        if (e.target.closest('#btn-open-meetup')) { renderMeetupBoard(); openMeetupModal(); return; }
        if (e.target.closest('#btn-close-meetup')) { closeMeetupModal(); return; }
        if (e.target.closest('#btn-save-meetup')) { submitMeetup(); return; }
        if (e.target.closest('#btn-clear-meetup')) { clearActiveMeetup(); return; }
        if (e.target.closest('.open-quote-btn')) { openQuoteModal(e.target.closest('.open-quote-btn').dataset.location); return; }
        if (e.target.closest('#btn-close-quote')) { closeQuoteModal(); return; }
        if (e.target.closest('#btn-save-quote')) { submitNewQuote(); return; }
        if (e.target.closest('#btn-manage-quotes')) { openManageQuotesModal(); return; }
        if (e.target.closest('#btn-close-manage-quotes')) { closeManageQuotesModal(); return; }
        if (e.target.closest('.delete-quote-btn')) {
            const btn = e.target.closest('.delete-quote-btn');
            if (confirm("Permanently delete?")) {
                await deleteQuoteFromSheet(btn.dataset.loc, btn.dataset.quote, btn.dataset.author);
                renderAdminQuotes(); renderMeetupBoard(); renderScoreboard();
            } return;
        }
        if (e.target.closest('#btn-drop-anchor')) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    localStorage.setItem('carAnchor', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, timestamp: Date.now() }));
                    triggerConfetti(); renderAnchor();
                }, err => alert("GPS Error"), { enableHighAccuracy: true });
            } return;
        }
        if (e.target.closest('#btn-clear-anchor')) { if(confirm("Car found! Clear?")) { localStorage.removeItem('carAnchor'); renderAnchor(); } return; }
        const wBtn = e.target.closest('.weather-btn'); if (wBtn) { setWeatherCity(wBtn.id.replace('btn-w-', '')); return; }
        if (e.target.closest('#home-weather-pill')) { openWeatherModal(); return; }
        if (e.target.closest('#btn-close-weather')) { closeWeatherModal(); return; }
        const nBtn = e.target.closest('.nav-btn'); if (nBtn) { openTab(nBtn.id.replace('nav-btn-', '')); return; }
        const tBtn = e.target.closest('.tips-btn'); if (tBtn) { openTipsModal(tBtn.dataset.city); return; }
        const ttBtn = e.target.closest('.tips-tab-btn'); if (ttBtn) { document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active')); ttBtn.classList.add('active'); renderTips(ttBtn.dataset.cat); return; }
        if (e.target.closest('#btn-close-tips')) { closeTipsModal(); return; }
        if (e.target.closest('#btn-open-admin')) { openTab('admin'); return; }
        if (e.target.closest('#btn-spin-roulette')) { spinRoulette(); return; }
        if (e.target.closest('#btn-reset-tally')) { resetRouletteScores(); return; }
        if (e.target.closest('#btnLight')) { setThemeMode(false); return; }
        if (e.target.closest('#btnDark')) { setThemeMode(true); return; }
        if (e.target.closest('#btn-clear-families')) { clearCustomFamilies(); return; }
        if (e.target.closest('#btn-force-sync')) {
            const btn = e.target.closest('#btn-force-sync'); const originalText = btn.innerText; 
            btn.innerText = cheekyMessages[Math.floor(Math.random() * cheekyMessages.length)];
            await loadAllData(); populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); renderUpNext(); renderAnchor(); renderMeetupBoard(); renderScoreboard();
            btn.innerText = "✅ Synced!"; setTimeout(() => { btn.innerText = originalText; }, 2000); return;
        }
        if (e.target.closest('#btn-update-version')) {
            const btn = e.target.closest('#btn-update-version'); btn.innerText = "⏳ Updating...";
            if('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => { for(let r of regs) r.update(); }); }
            setTimeout(() => { window.location.reload(true); }, 500); return;
        }
        if (e.target.closest('#hero-la')) { triggerEmojiRain('la'); return; }
        if (e.target.closest('#hero-utah')) { triggerEmojiRain('utah'); return; }
        if (e.target.closest('#hero-vegas')) { triggerEmojiRain('vegas'); return; }
        if (e.target.closest('#hero-flights')) { triggerEmojiRain('flights'); return; }
        if (e.target.closest('#btn-close-stay')) { closeStayModal(); return; }
        if (e.target.closest('#btn-close-completion-x') || e.target.closest('#btn-cancel-modal')) { closeCompletionModal(); return; }
        if (e.target.closest('#btn-confirm-modal')) {
            let done = await getVal('completedTasks') || []; done.push(document.getElementById('completion-modal').dataset.activeTaskId);
            await setVal('completedTasks', done); syncToCloud('completion', done); triggerConfetti(); closeCompletionModal(); renderItinerary(); renderUpNext(); return;
        }
        const editGateBtn = e.target.closest('.edit-gate-btn');
        if (editGateBtn) { e.stopPropagation(); openGateModal(e.target.closest('.edit-gate-btn').dataset.flightid); return; }
        if (e.target.closest('#btn-close-gate')) { closeGateModal(); return; }
        if (e.target.closest('#btn-save-gate')) {
            const m = document.getElementById('gate-modal'); const res = `T${document.getElementById('gate-input-term').value} G${document.getElementById('gate-input-gate').value}`;
            state.gateOverrides[m.dataset.flightid] = res; await setVal('gateOverrides', state.gateOverrides); syncToCloud('gateUpdate', state.gateOverrides); renderTravelVault(); closeGateModal(); return;
        }
        const travelCard = e.target.closest('.flip-container');
        if (travelCard && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') { 
            travelCard.classList.toggle('is-flipped'); return; 
        }
        const stayCard = e.target.closest('.stay-card');
        if (stayCard) { const s = stayCard.dataset; openStayModal(s.fam, s.addr, s.map, s.link, s.img); return; }
        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName !== 'A') { const c = activeCard; openCompletionModal(c.dataset.taskId, c.dataset.taskName); return; }
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName !== 'A') {
            let done = await getVal('completedTasks') || []; done = done.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', done); renderItinerary(); renderUpNext(); return;
        }
        const deleteDocBtn = e.target.closest('.delete-doc-btn');
        if (deleteDocBtn) {
            e.preventDefault(); e.stopPropagation();
            if(confirm("Delete doc?")) {
                let docs = await getVal('offline_docs') || []; docs = docs.filter(d => d.id !== deleteDocBtn.dataset.id);
                await setVal('offline_docs', docs); renderWallet();
            } return;
        }
    });
}

async function bootApp() {
    handleSplashLogic();
    bindEvents(); initPullToRefresh(); 
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') !== null ? localStorage.getItem('HolidayPlanner_Theme') === 'true' : prefersDark.matches);
    try { state.gateOverrides = await getVal('gateOverrides') || {}; } catch(e) { state.gateOverrides = {}; }
    await loadAllData(); 
    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderWallet(); renderUpNext(); renderAnchor(); renderMeetupBoard();
    initLiveCurrency(); initWeatherPill();
    updateTimeAndCountdown(); setInterval(updateTimeAndCountdown, 10000);
    if (document.getElementById('roulette-wheel')) initWheel();
    setInterval(async () => {
        if(navigator.onLine) { await loadAllData(); renderMeetupBoard(); renderScoreboard(); }
        renderUpNext();
    }, 60000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootApp); else bootApp();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
