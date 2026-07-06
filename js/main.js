import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud, deleteQuoteFromSheet } from './api.js';

import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, updateGreeting, saveTripSettings,
    populateDropdown, clearCustomFamilies, updateFamilyFilter, renderItinerary, renderTravelVault, 
    renderAccommodations, handleFileUpload, renderWallet, openCompletionModal, closeCompletionModal, 
    triggerConfetti, triggerEmojiRain, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openGateModal, closeGateModal, renderUpNext, renderAnchor, openQuoteModal, closeQuoteModal, submitNewQuote, 
    openManageQuotesModal, closeManageQuotesModal, renderAdminQuotes, 
    openLightbox, closeLightbox,
    openVegasFoodModal, closeVegasFoodModal, renderVegasFoodList,
    checkMorningBriefing, closeMorningBriefing, openMorningBriefing,
    openNavChoiceModal, closeNavChoiceModal,
    openRoadtripModal, closeRoadtripModal
} from './ui.js';

import { convertCurrency, setTip, calculateTip } from './features/tools.js';
import { initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal } from './features/weather.js';
import { initWheel, spinRoulette, renderScoreboard, resetRouletteScores } from './features/roulette.js';
import { renderMeetupBoard, openMeetupModal, closeMeetupModal, submitMeetup, clearActiveMeetup } from './features/meetup.js';
import { openChecklistModal, closeChecklistModal, toggleChecklistItem, resetChecklist } from './features/checklist.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];
window.appCheckMorningBriefing = checkMorningBriefing;

const cheekyMessages = ["Bribing the pit boss...", "Fueling the jet...", "Locating Dave's wallet...", "Checking trail maps...", "Mixing the margaritas...", "Packing the bags...", "Hiding from the paparazzi..."];

export function openTab(pageId) {
    if (navigator.vibrate) navigator.vibrate(40); 
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        if (modal.style.display === 'flex' || modal.classList.contains('active')) {
            modal.classList.remove('active');
            setTimeout(() => { 
                modal.style.display = 'none'; 
                document.body.classList.remove('no-scroll'); 
                const lbImg = document.getElementById('lightbox-img');
                if(lbImg) lbImg.src = '';
            }, 300);
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

function injectDangerButton() {
    const homeSection = document.getElementById('home');
    if (!homeSection || document.getElementById('danger-prank-btn')) return;

    const dangerContainer = document.createElement('div');
    dangerContainer.id = 'danger-prank-btn';
    dangerContainer.style.display = 'flex';
    dangerContainer.style.alignItems = 'center';
    dangerContainer.style.justifyContent = 'center';
    dangerContainer.style.gap = '12px';
    dangerContainer.style.marginTop = '25px';
    dangerContainer.style.marginBottom = '25px';
    dangerContainer.style.padding = '10px';
    dangerContainer.style.cursor = 'pointer';
    dangerContainer.style.opacity = '0.85';

    dangerContainer.innerHTML = `
        <div style="width: 18px; height: 18px; background-color: #ff3b30; border-radius: 50%; box-shadow: 0 0 15px #ff3b30; animation: dangerPulse 1.5s infinite;"></div>
        <span style="font-size: 13px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 1px; opacity: 0.7;">DO NOT PRESS THIS BUTTON</span>
        <style>@keyframes dangerPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }</style>
    `;

    const weatherPill = document.getElementById('home-weather-pill');
    if (weatherPill) {
        homeSection.insertBefore(dangerContainer, weatherPill);
    } else {
        homeSection.appendChild(dangerContainer);
    }
}

function bindEvents() {
    document.getElementById('roulette-mode')?.addEventListener('change', initWheel);
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('trip-end-date')?.addEventListener('change', saveTripSettings);
    
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });

    document.body.addEventListener('click', async (e) => {

        // --- PRANKS ---
        if (e.target.closest('#danger-prank-btn')) { triggerJackpotMode(); return; }
        if (e.target.closest('#btn-trap-upgrade')) { triggerFlightDivert(); return; }

        // --- NORMAL APP CLICK EVENTS ---
        if (e.target.closest('.disney-app-btn')) { window.location.href = 'https://disneyland.disney.go.com/'; return; }
        if (e.target.closest('#btn-close-nav-choice')) { closeNavChoiceModal(); return; }
        if (e.target.closest('.nav-trigger-btn')) {
            const btn = e.target.closest('.nav-trigger-btn');
            openNavChoiceModal(btn.dataset.query, null, null, btn.dataset.loc || ''); return;
        }
        if (e.target.closest('#btn-find-car')) {
            const btn = e.target.closest('#btn-find-car');
            openNavChoiceModal(null, btn.dataset.lat, btn.dataset.lon, ''); return;
        }
        
        if (e.target.closest('#btn-nav-google') || e.target.closest('#btn-nav-waze') || e.target.closest('#btn-nav-uber') || e.target.closest('#btn-nav-alltrails')) {
            const btnId = e.target.closest('button').id;
            const modal = document.getElementById('nav-choice-modal');
            const q = modal.dataset.query; const lat = modal.dataset.lat; const lon = modal.dataset.lon;
            let url = ''; const encodedQ = encodeURIComponent(q || '');
            
            if (btnId === 'btn-nav-waze') { 
                if (lat && lon) url = `waze://?ll=${lat},${lon}&navigate=yes`; 
                else url = `waze://?q=${encodedQ}&navigate=yes`; 
                setTimeout(() => { if (document.visibilityState === 'visible') { window.location.href = (lat && lon) ? `https://waze.com/ul?ll=${lat},${lon}&navigate=yes` : `https://waze.com/ul?q=${encodedQ}&navigate=yes`; } }, 800);
            } 
            else if (btnId === 'btn-nav-google') { 
                if (lat && lon) url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`; 
                else url = `https://www.google.com/maps/dir/?api=1&destination=${encodedQ}`; 
            } 
            else if (btnId === 'btn-nav-uber') { url = `https://m.uber.com/ul/?action=setPickup&dropoff[query]=${encodedQ}`; } 
            else if (btnId === 'btn-nav-alltrails') { url = `https://www.alltrails.com/search?q=${encodedQ}`; }
            if (url) window.location.href = url;
            closeNavChoiceModal(); return;
        }

        const linkBtn = e.target.closest('.link-btn'); if (linkBtn && linkBtn.dataset.url) { window.location.href = linkBtn.dataset.url; return; }
        if (e.target.closest('#btn-manual-briefing')) { openMorningBriefing(); return; }
        if (e.target.closest('#btn-close-briefing')) { closeMorningBriefing(); return; }
        
        // ROAD TRIPS
        const rtBtn = e.target.closest('.rt-btn');
        if (rtBtn) { openRoadtripModal(rtBtn.dataset.route); return; }
        if (e.target.closest('#btn-close-roadtrip')) { closeRoadtripModal(); return; }
        
        if (e.target.closest('#btn-vegas-food')) { openVegasFoodModal(); return; }
        if (e.target.closest('#btn-close-vegas-food')) { closeVegasFoodModal(); return; }
        
        const vfBtn = e.target.closest('.vegas-food-tab-btn');
        if (vfBtn) { document.querySelectorAll('.vegas-food-tab-btn').forEach(b => b.classList.remove('active')); vfBtn.classList.add('active'); renderVegasFoodList(vfBtn.dataset.cat); return; }

        if (e.target.closest('.wallet-doc-link')) { e.preventDefault(); openLightbox(e.target.closest('.wallet-doc-link').dataset.src); return; }
        if (e.target.closest('#btn-close-lightbox') || e.target.id === 'lightbox-modal') { closeLightbox(); return; }

        if (e.target.closest('#copy-addr-btn')) {
            const btn = e.target.closest('#copy-addr-btn'); const addr = btn.dataset.addr;
            if(navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(addr); } else {
                const textArea = document.createElement("textarea"); textArea.value = addr; document.body.appendChild(textArea); textArea.focus(); textArea.select();
                try { document.execCommand('copy'); } catch(err) {} document.body.removeChild(textArea);
            }
            const originalHtml = btn.innerHTML; btn.innerHTML = `✅ Copied!`; btn.style.background = '#34c759'; btn.style.color = 'white'; btn.style.borderColor = '#34c759';
            if(navigator.vibrate) navigator.vibrate(20);
            setTimeout(() => { btn.innerHTML = originalHtml; btn.style.background = 'rgba(0,0,0,0.05)'; btn.style.color = 'var(--text)'; btn.style.borderColor = 'var(--ios-grey)'; }, 2000);
            return;
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

        if (e.target.closest('#btn-open-meetup')) { 
            const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
            if (meetups.length > 0) { const latest = meetups[meetups.length - 1]; await setVal('lastSeenMeetupId', btoa(latest[1] + latest[2]).substring(0, 12)); }
            renderMeetupBoard(); openMeetupModal(); return; 
        }
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

        if (e.target.closest('#btn-clear-anchor')) { if(confirm("Car found! Clear the saved location?")) { localStorage.removeItem('carAnchor'); renderAnchor(); } return; }
        
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
        
        if (e.target.closest('#btn-enable-notifs')) {
            const btn = e.target.closest('#btn-enable-notifs');
            if ('Notification' in window) {
                if (Notification.permission === 'granted') { btn.innerHTML = '✅ Already Enabled'; btn.style.backgroundColor = '#34c759'; btn.style.color = 'white'; return; }
                Notification.requestPermission().then(perm => {
                    if (perm === 'granted') { btn.innerHTML = '✅ Enabled'; btn.style.backgroundColor = '#34c759'; btn.style.color = 'white'; } else { alert('Notifications denied in device settings.'); }
                });
            } else { alert('Push notifications are not supported on this device.'); }
            return;
        }
        
        const tipBtn = e.target.closest('.tip-btn'); if (tipBtn) { setTip(parseInt(tipBtn.dataset.tip), tipBtn); return; }
        const splitBtn = e.target.closest('.split-btn'); if (splitBtn) { document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active')); splitBtn.classList.add('active'); calculateTip(); return; }
        if (e.target.closest('#clear-usd')) { document.getElementById('usd-input').value = ''; convertCurrency(); return; }
        if (e.target.closest('#btnLight')) { setThemeMode(false); return; }
        if (e.target.closest('#btnDark')) { setThemeMode(true); return; }
        if (e.target.closest('#btn-clear-families')) { clearCustomFamilies(); return; }

        if (e.target.closest('#btn-force-sync')) {
            const btn = e.target.closest('#btn-force-sync');
            const originalText = btn.innerText; 
            btn.innerText = cheekyMessages[Math.floor(Math.random() * cheekyMessages.length)];
            await loadAllData(); 
            populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); renderUpNext(); renderAnchor(); renderMeetupBoard(); renderScoreboard();
            btn.innerText = "✅ Synced!"; setTimeout(() => { btn.innerText = originalText; }, 2000); 
            return;
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
            travelCard.classList.toggle('is-flipped'); if(navigator.vibrate) navigator.vibrate(20); return; 
        }
        const stayCard = e.target.closest('.stay-card');
        if (stayCard) { const s = e.target.closest('.stay-card').dataset; openStayModal(s.fam, s.addr, s.map, s.link, s.img); return; }
        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName !== 'A') { const c = e.target.closest('.itin-card'); openCompletionModal(c.dataset.taskId, c.dataset.taskName); return; }
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName !== 'A') {
            let done = await getVal('completedTasks') || []; done = done.filter(id => id !== e.target.closest('.itin-card').dataset.taskId);
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

window.forceAppUpdate = () => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); updateGreeting(); renderAnchor(); renderMeetupBoard(); renderScoreboard(); };

async function bootApp() {
    bindEvents(); 
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') !== null ? localStorage.getItem('HolidayPlanner_Theme') === 'true' : prefersDark.matches);
    history.replaceState({ pageId: 'home' }, '', '#home');

    try { state.gateOverrides = await getVal('gateOverrides') || {}; } catch(e) { state.gateOverrides = {}; }

    try { await loadAllData(); } catch(e) { console.error("Boot error:", e); }
    
    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderWallet(); renderUpNext(); renderAnchor(); renderMeetupBoard();
    initLiveCurrency(); initWeatherPill();
    updateTimeAndCountdown(); setInterval(updateTimeAndCountdown, 10000);
    
    injectDangerButton(); 
    
    if (document.getElementById('roulette-wheel')) initWheel();

    setInterval(async () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notified = await getVal('notifiedTasks') || [];
            const now = Date.now();
            if(state.itineraryData) {
                state.itineraryData.forEach(cols => {
                    if(!cols || cols.length < 5) return;
                    const taskId = btoa(encodeURIComponent(`${cols[0].trim()}-${cols[1].trim()}-${cols[2].trim()}-${cols[3].trim()}`)).replace(/=/g, '');
                    if (notified.includes(taskId)) return;
                    const taskTime = parseDateTime(cols[0].trim(), cols[3].trim());
                    if (taskTime && taskTime > now && (taskTime - now) <= 1800000) { 
                        new Notification('Upcoming Activity', { body: `${cols[3].trim()} - ${cols[2].trim()}`, icon: 'img/icon-192.png' });
                        notified.push(taskId); setVal('notifiedTasks', notified);
                    }
                });
            }
        }
        if(navigator.onLine) { await loadAllData(); renderMeetupBoard(); renderScoreboard(); }
        renderUpNext();
    }, 60000);
}

// ------------------------------------------------------------------
// 🎭 PRANK ENGINES
// ------------------------------------------------------------------

function triggerJackpotMode() {
    if (!document.getElementById('jackpot-animations')) {
        const style = document.createElement('style'); style.id = 'jackpot-animations';
        style.innerHTML = `@keyframes jackpotPulse { 0% { transform: scale(1); } 100% { transform: scale(1.05); } } @keyframes giftWiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }`;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'jackpot-overlay'; overlay.style.position = 'fixed'; overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.95)'; overlay.style.zIndex = '20000';
    overlay.style.display = 'flex'; overlay.style.flexDirection = 'column'; overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center'; overlay.style.color = '#ffd60a'; overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif'; overlay.style.textAlign = 'center'; overlay.style.padding = '20px';
    
    overlay.innerHTML = `
        <div id="jackpot-content" style="display: flex; flex-direction: column; align-items: center; transition: all 0.4s ease;">
            <div style="font-size: 80px; margin-bottom: 20px; animation: jackpotPulse 0.5s infinite alternate;">🎰</div>
            <h1 style="font-size: 40px; font-weight: 900; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px #ffd60a;">JACKPOT!</h1>
            <div style="font-size: 20px; font-weight: 700; margin-top: 10px; color: white;">VEGAS MODE UNLOCKED</div>
            
            <button id="btn-open-prize" style="margin-top: 45px; padding: 20px 40px; font-size: 22px; font-weight: 900; background: linear-gradient(45deg, #ff3b30, #ff9500); color: white; border: none; border-radius: 15px; cursor: pointer; box-shadow: 0 10px 25px rgba(255, 59, 48, 0.5); display: flex; align-items: center; gap: 12px; animation: jackpotPulse 0.8s infinite alternate;">
                <span style="font-size: 35px; animation: giftWiggle 2s infinite;">🎁</span> OPEN PRIZE
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100, 50, 200]);
    dropEpicJackpotConfetti();

    document.getElementById('btn-open-prize').addEventListener('click', () => {
        const content = document.getElementById('jackpot-content');
        if (navigator.vibrate) navigator.vibrate([200, 100, 300]); 
        content.style.transform = 'scale(0.8)'; content.style.opacity = '0';
        
        setTimeout(() => {
            content.innerHTML = `
                <div style="font-size: 90px; margin-bottom: 10px;">🍽️</div>
                <h1 style="font-size: 38px; font-weight: 900; margin: 0; color: #ff3b30; text-shadow: 0 0 20px rgba(255, 59, 48, 0.6);">SURPRISE!</h1>
                <div style="font-size: 24px; font-weight: 800; margin-top: 25px; color: white; line-height: 1.4;">YOUR PRIZE IS...<br><span style="color: #34c759; font-size: 32px; display: block; margin-top: 10px;">YOU'RE PAYING FOR DINNER! 💳💸</span></div>
                <div style="font-size: 16px; margin-top: 20px; color: rgba(255,255,255,0.5); font-style: italic;">(We accept steak, sushi, or lobster)</div>
                <button id="close-jackpot" style="margin-top: 40px; padding: 15px 30px; font-size: 18px; font-weight: 900; background: #333; color: white; border: 2px solid #555; border-radius: 25px; cursor: pointer;">I ACCEPT MY FATE</button>
            `;
            content.style.transform = 'scale(1)'; content.style.opacity = '1';
            document.getElementById('close-jackpot').addEventListener('click', () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); });
        }, 400); 
    });
}

function dropEpicJackpotConfetti() {
    if (!document.getElementById('epic-confetti-style')) {
        const style = document.createElement('style'); style.id = 'epic-confetti-style';
        style.innerHTML = `@keyframes epicConfettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(120vh) rotate(720deg); opacity: 0; } }`;
        document.head.appendChild(style);
    }

    const emojis = ['✈️', '🎲', '🎰', '⛰️', '🌴', '💵', '🍹']; const colors = ['#ff3b30', '#34c759', '#007aff', '#ffcc00', '#af52de', '#ff9500'];
    
    for (let i = 0; i < 200; i++) {
        const el = document.createElement('div');
        if (Math.random() > 0.5) { el.innerText = emojis[Math.floor(Math.random() * emojis.length)]; el.style.fontSize = Math.random() * 20 + 15 + 'px'; el.style.background = 'transparent'; } 
        else { el.style.background = colors[Math.floor(Math.random() * colors.length)]; el.style.width = Math.random() * 10 + 8 + 'px'; el.style.height = Math.random() * 20 + 10 + 'px'; el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0px'; }
        
        el.style.position = 'fixed'; el.style.left = Math.random() * 100 + 'vw'; el.style.top = '-10vh'; 
        el.style.zIndex = '21000'; el.style.pointerEvents = 'none'; 
        el.style.animation = `epicConfettiFall ${Math.random() * 3 + 2}s linear forwards`; el.style.animationDelay = Math.random() * 1.5 + 's';
        document.body.appendChild(el); setTimeout(() => el.remove(), 6000);
    }
}

function triggerFlightDivert() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.backgroundColor = '#ff3b30'; overlay.style.zIndex = '25000';
    overlay.style.display = 'flex'; overlay.style.flexDirection = 'column'; overlay.style.justifyContent = 'center'; overlay.style.alignItems = 'center'; overlay.style.color = 'white'; overlay.style.padding = '30px'; overlay.style.textAlign = 'center'; overlay.style.fontFamily = 'system-ui, sans-serif';

    overlay.innerHTML = `<div style="font-size: 80px; margin-bottom: 20px;">⚠️</div><h1 style="font-size: 30px; font-weight: 900; text-transform: uppercase;">CRITICAL ALERT</h1><p style="font-size: 20px; font-weight: 700; margin-top: 20px;">Flight routing modified by ATC.</p><p style="font-size: 18px; margin-top: 10px;">Diverting to: <br><b style="font-size:24px;">Tijuana, Mexico (TIJ)</b><br><br>ETA Delay: +14 Hours</p>`;
    document.body.appendChild(overlay); if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);

    setTimeout(() => {
        overlay.style.backgroundColor = '#34c759';
        overlay.innerHTML = `<div style="font-size: 80px; margin-bottom: 20px;">🍻</div><h1 style="font-size: 35px; font-weight: 900;">JUST KIDDING!</h1><p style="font-size: 20px; font-weight: 700; margin-top: 20px;">Go get a beer.</p>`;
        setTimeout(() => { overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.5s ease'; setTimeout(() => overlay.remove(), 500); }, 4000);
    }, 6000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootApp); else bootApp();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
