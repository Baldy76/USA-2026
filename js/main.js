import { state, setVal, getVal, parseDateTime } from './store.js?v=6.2.1';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud, deleteQuoteFromSheet } from './api.js?v=6.2.1';

import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, updateGreeting, saveTripSettings,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal,
    renderItinerary, renderTravelVault, renderAccommodations, handleFileUpload, renderWallet,
    openCompletionModal, closeCompletionModal, triggerConfetti, triggerEmojiRain,
    initWheel, spinRoulette, renderScoreboard, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openGateModal, closeGateModal, renderUpNext, renderAnchor,
    openQuoteModal, closeQuoteModal, submitNewQuote, openManageQuotesModal, closeManageQuotesModal, renderAdminQuotes,
    renderMeetupBoard, openMeetupModal, closeMeetupModal, submitMeetup
} from './ui.js?v=6.2.1';

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
                loadAllData().then(() => { 
                    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); renderMeetupBoard();
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
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('trip-end-date')?.addEventListener('change', saveTripSettings);
    
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });

    document.body.addEventListener('click', async (e) => {

        // URGENT ALERT CLOSE
        if (e.target.closest('#btn-close-urgent')) {
            document.getElementById('urgent-alert-overlay').style.display = 'none';
            const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
            if (meetups.length > 0) {
                const latest = meetups[meetups.length - 1];
                const messageId = btoa(latest[1] + latest[2]).substring(0, 12);
                await setVal('lastSeenMeetupId', messageId);
            }
            renderMeetupBoard();
            return;
        }

        // MEETUP BOARD OPEN
        if (e.target.closest('#btn-open-meetup')) { 
            const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
            if (meetups.length > 0) {
                const latest = meetups[meetups.length - 1];
                const messageId = btoa(latest[1] + latest[2]).substring(0, 12);
                await setVal('lastSeenMeetupId', messageId);
            }
            renderMeetupBoard();
            openMeetupModal(); 
            return; 
        }
        if (e.target.closest('#btn-close-meetup')) { closeMeetupModal(); return; }
        if (e.target.closest('#btn-save-meetup')) { submitMeetup(); return; }

        if (e.target.closest('.open-quote-btn')) { openQuoteModal(e.target.closest('.open-quote-btn').dataset.location); return; }
        if (e.target.closest('#btn-close-quote')) { closeQuoteModal(); return; }
        if (e.target.closest('#btn-save-quote')) { submitNewQuote(); return; }

        if (e.target.closest('#btn-manage-quotes')) { openManageQuotesModal(); return; }
        if (e.target.closest('#btn-close-manage-quotes')) { closeManageQuotesModal(); return; }

        if (e.target.closest('.delete-quote-btn')) {
            const btn = e.target.closest('.delete-quote-btn');
            if (confirm("Permanently delete?")) {
                await deleteQuoteFromSheet(btn.dataset.loc, btn.dataset.quote, btn.dataset.author);
                renderAdminQuotes(); renderMeetupBoard();
            }
            return;
        }

        if (e.target.closest('#btn-drop-anchor')) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    localStorage.setItem('carAnchor', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, timestamp: Date.now() }));
                    triggerConfetti(); renderAnchor();
                }, err => alert("GPS Error"), { enableHighAccuracy: true });
            }
            return;
        }

        if (e.target.closest('#btn-find-car')) {
            const btn = e.target.closest('#btn-find-car');
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${btn.dataset.lat},${btn.dataset.lon}&travelmode=walking`, '_blank');
            return;
        }

        if (e.target.closest('#btn-clear-anchor')) { if(confirm("Clear location?")) { localStorage.removeItem('carAnchor'); renderAnchor(); } return; }
        
        const wBtn = e.target.closest('.weather-btn'); if (wBtn) { setWeatherCity(wBtn.id.replace('btn-w-', '')); return; }
        if (e.target.closest('#home-weather-pill')) { openWeatherModal(); return; }
        if (e.target.closest('#btn-close-weather')) { closeWeatherModal(); return; }
        const nBtn = e.target.closest('.nav-btn'); if (nBtn) { openTab(nBtn.id.replace('nav-btn-', '')); return; }
        const tBtn = e.target.closest('.tips-btn'); if (tBtn) { openTipsModal(tBtn.dataset.city); return; }
        const ttBtn = e.target.closest('.tips-tab-btn'); if (ttBtn) { document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active')); ttBtn.classList.add('active'); renderTips(ttBtn.dataset.cat); return; }
        if (e.target.closest('#btn-close-tips')) { closeTipsModal(); return; }
        if (e.target.closest('#btn-open-admin')) { openTab('admin'); return; }
        if (e.target.closest('#btn-spin-roulette')) { spinRoulette(); return; }
        if (e.target.closest('#btn-reset-tally')) { if(confirm("Clear scores?")) { localStorage.removeItem('rouletteTallies'); renderScoreboard(); } return; }
        
        if (e.target.closest('#btn-enable-notifs')) {
            if ('Notification' in window) { Notification.requestPermission().then(perm => { if (perm === 'granted') { e.target.innerText = '✅ Enabled'; e.target.style.background = '#34c759'; } }); } return;
        }
        
        const tipBtn = e.target.closest('.tip-btn'); if (tipBtn) { setTip(parseInt(tipBtn.dataset.tip), tipBtn); return; }
        const splitBtn = e.target.closest('.split-btn'); if (splitBtn) { document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active')); splitBtn.classList.add('active'); calculateTip(); return; }
        if (e.target.closest('#clear-usd')) { document.getElementById('usd-input').value = ''; convertCurrency(); return; }
        if (e.target.closest('#btnLight')) { setThemeMode(false); return; }
        if (e.target.closest('#btnDark')) { setThemeMode(true); return; }
        if (e.target.closest('#btn-clear-families')) { clearCustomFamilies(); return; }
        if (e.target.closest('#btn-force-sync')) { await loadAllData(); populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); renderMeetupBoard(); return; }
        if (e.target.closest('#btn-update-version')) { if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.update())); window.location.reload(true); return; }
        if (e.target.closest('#hero-la')) { triggerEmojiRain('la'); return; }
        if (e.target.closest('#hero-utah')) { triggerEmojiRain('utah'); return; }
        if (e.target.closest('#hero-vegas')) { triggerEmojiRain('vegas'); return; }
        if (e.target.closest('#btn-close-stay')) { closeStayModal(); return; }
        if (e.target.closest('#btn-close-completion-x') || e.target.closest('#btn-cancel-modal')) { closeCompletionModal(); return; }
        if (e.target.closest('#btn-confirm-modal')) {
            let done = await getVal('completedTasks') || []; done.push(document.getElementById('completion-modal').dataset.activeTaskId);
            await setVal('completedTasks', done); syncToCloud('completion', done); triggerConfetti(); closeCompletionModal(); renderItinerary(); renderUpNext(); return;
        }
        if (e.target.closest('.edit-gate-btn')) { e.stopPropagation(); openGateModal(e.target.closest('.edit-gate-btn').dataset.flightid); return; }
        if (e.target.closest('#btn-save-gate')) {
            const m = document.getElementById('gate-modal'); const res = `T${document.getElementById('gate-input-term').value} G${document.getElementById('gate-input-gate').value}`;
            state.gateOverrides[m.dataset.flightid] = res; await setVal('gateOverrides', state.gateOverrides); syncToCloud('gateUpdate', state.gateOverrides); renderTravelVault(); closeGateModal(); return;
        }
        if (e.target.closest('.flip-container')) { e.target.closest('.flip-container').classList.toggle('is-flipped'); return; }
        if (e.target.closest('.stay-card')) { const s = e.target.closest('.stay-card').dataset; openStayModal(s.fam, s.addr, s.map, s.link, s.img); return; }
        if (e.target.closest('.itin-card:not(.completed)')) { const c = e.target.closest('.itin-card'); openCompletionModal(c.dataset.taskId, c.dataset.taskName); return; }
        if (e.target.closest('.itin-card.completed')) {
            let done = await getVal('completedTasks') || []; done = done.filter(id => id !== e.target.closest('.itin-card').dataset.taskId);
            await setVal('completedTasks', done); renderItinerary(); renderUpNext(); return;
        }
        if (e.target.closest('.link-btn')) { window.open(e.target.closest('.link-btn').dataset.url, '_blank'); return; }
    });
}

async function bootApp() {
    bindEvents(); initSwipes(); initPullToRefresh(); 
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
    await loadAllData();
    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); renderWallet(); renderUpNext(); renderAnchor(); renderMeetupBoard();
    initLiveCurrency(); initWeatherPill();
    updateTimeAndCountdown(); setInterval(updateTimeAndCountdown, 10000);
    
    // HEARTBEAT SYNC ENGINE
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
        if(navigator.onLine) {
            await loadAllData();
            renderMeetupBoard();
        }
        renderUpNext();
    }, 60000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootApp); else bootApp();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=6.2.1');
