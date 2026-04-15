import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages } from './api.js';
import { 
    renderItinerary, renderTravelVault, renderAccommodations, 
    openCompletionModal, closeCompletionModal, applyTheme, setThemeMode, updateMetaThemeColor,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    setWeatherCity, autoSetWeatherCity, updateTimeAndCountdown, saveTripSettings,
    handleFileUpload, renderWallet, triggerConfetti, triggerEmojiRain, triggerHype, spinRoulette,
    openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal, openTravelModal, closeTravelModal,
    initWeatherPill, openWeatherModal, closeWeatherModal 
} from './ui.js';
import { syncToCloud } from './api.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

// ROUTER
export function openTab(pageId, isPopState = false) {
    if (navigator.vibrate) navigator.vibrate(40); 
    const activeTab = document.querySelector('.tab-content.active');
    document.querySelectorAll('.tab-content').forEach(tab => { tab.className = 'page tab-content'; });
    const targetPage = document.getElementById(pageId); if(targetPage) targetPage.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('nav-btn-' + pageId); if(activeBtn) activeBtn.classList.add('active');
    const isDark = document.body.classList.contains('dark-mode');
    document.body.className = `${isDark ? 'dark-mode' : 'light-mode'} theme-${pageId}`;
    updateMetaThemeColor(pageId); updateTimeAndCountdown();
    if (!isPopState) history.pushState({ pageId: pageId }, '', `#${pageId}`);
}

window.addEventListener('popstate', (e) => { if (e.state && e.state.pageId) openTab(e.state.pageId, true); else openTab('home', true); });

function bindEvents() {
    const loginSelector = document.getElementById('login-selector');
    const splashGoBtn = document.getElementById('splash-go-btn');

    if (loginSelector && splashGoBtn) {
        const savedUser = localStorage.getItem('appUser');
        if (savedUser) {
            loginSelector.value = savedUser;
            splashGoBtn.innerText = `Let's go, ${savedUser}! ✈️`;
            splashGoBtn.disabled = false; splashGoBtn.style.opacity = '1';
        }

        loginSelector.addEventListener('change', function() {
            const userName = this.value;
            localStorage.setItem('appUser', userName);
            splashGoBtn.innerText = `Let's go, ${userName}! ✈️`;
            splashGoBtn.disabled = false; splashGoBtn.style.opacity = '1';
            const famSel = document.getElementById('family-selector');
            if (famSel) {
                let customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
                if (!customFamilies.includes(userName) && userName !== 'All') {
                    customFamilies.push(userName); localStorage.setItem('customFamilies', JSON.stringify(customFamilies));
                    populateDropdown();
                } famSel.value = userName; updateFamilyFilter();
            }
        });

        // THE FIX: ENTRY BUTTON LOGIC
        splashGoBtn.addEventListener('click', () => {
            const splash = document.getElementById('splash');
            splash.classList.remove('active');
            setTimeout(() => { splash.style.display = 'none'; }, 400);
            openTab('home');
        });
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', function() { openTab(this.id.replace('nav-btn-', '')); }));
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    document.getElementById('btn-spin-roulette')?.addEventListener('click', spinRoulette);
    document.getElementById('btn-hype')?.addEventListener('click', triggerHype);
    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.querySelectorAll('.tip-btn').forEach(btn => btn.addEventListener('click', function() { setTip(parseInt(this.dataset.tip), this); }));
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.getElementById('btn-open-admin')?.addEventListener('click', () => openTab('admin'));
    document.getElementById('home-weather-pill')?.addEventListener('click', openWeatherModal);
    document.getElementById('btn-close-weather')?.addEventListener('click', closeWeatherModal);
    document.querySelectorAll('.weather-btn').forEach(btn => btn.addEventListener('click', function() { setWeatherCity(this.id.replace('btn-w-', '')); }));
    document.querySelectorAll('.tips-btn').forEach(btn => btn.addEventListener('click', function() { openTipsModal(this.dataset.city); }));
    document.querySelectorAll('.tips-tab-btn').forEach(btn => btn.addEventListener('click', function() {
        document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); renderTips(this.dataset.cat);
    }));
    document.getElementById('btn-close-tips')?.addEventListener('click', closeTipsModal);
    document.getElementById('btn-close-stay')?.addEventListener('click', closeStayModal);
    document.getElementById('btn-close-travel')?.addEventListener('click', closeTravelModal);
    document.getElementById('btn-close-completion-x')?.addEventListener('click', closeCompletionModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCompletionModal);
    document.getElementById('btn-clear-families')?.addEventListener('click', clearCustomFamilies);
    document.getElementById('btnLight')?.addEventListener('click', () => setThemeMode(false));
    document.getElementById('btnDark')?.addEventListener('click', () => setThemeMode(true));
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('trip-start-date')?.addEventListener('change', saveTripSettings);
    document.getElementById('btn-force-sync')?.addEventListener('click', async function() {
        this.innerText = "⏳ Syncing..."; await loadAllData(); 
        populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages();
        this.innerText = "✅ Synced!"; setTimeout(() => { this.innerText = "☁️ Force Refresh Data"; }, 2000);
    });
    document.getElementById('btn-update-version')?.addEventListener('click', () => { window.location.reload(true); });
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });
    document.getElementById('btn-confirm-modal')?.addEventListener('click', async () => {
        const modal = document.getElementById('completion-modal');
        let completedTasks = await getVal('completedTasks') || []; completedTasks.push(modal.dataset.activeTaskId);
        await setVal('completedTasks', completedTasks); syncToCloud('completion', completedTasks); triggerConfetti(); closeCompletionModal(); renderItinerary(); 
    });
    document.body.addEventListener('click', async (e) => {
        const stayCard = e.target.closest('.stay-card'); if (stayCard) return openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.map, stayCard.dataset.link, stayCard.dataset.img);
        const travelCard = e.target.closest('.travel-card'); if (travelCard && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') return openTravelModal(travelCard.dataset);
        const editGate = e.target.closest('.edit-gate-btn'); if (editGate) {
            const newGate = prompt("New Gate Info:"); if (newGate) { if (!state.gateOverrides) state.gateOverrides = {}; state.gateOverrides[editGate.dataset.flightid] = newGate; await setVal('gateOverrides', state.gateOverrides); document.getElementById('modal-gate-text').innerText = newGate; renderTravelVault(); } return;
        }
        const activeCard = e.target.closest('.itin-card:not(.completed)'); if (activeCard && e.target.tagName !== 'A') return openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName);
        const completedCard = e.target.closest('.itin-card.completed'); if (completedCard && e.target.tagName !== 'A') {
            let tasks = await getVal('completedTasks') || []; tasks = tasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', tasks); renderItinerary();
        }
    });
}

window.addEventListener('load', async () => {
    bindEvents();
    state.gateOverrides = await getVal('gateOverrides') || {};
    await loadAllData(); populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); renderWallet();
    initLiveCurrency(); updateTimeAndCountdown(); initWeatherPill();
    setInterval(updateTimeAndCountdown, 60000);
    startNotificationEngine(); 
});
