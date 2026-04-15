import { state, setVal, getVal, parseDateTime } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages, syncToCloud } from './api.js';

// THE FIX: Explicitly mapped EVERY required function from ui.js
import { 
    applyTheme, setThemeMode, updateMetaThemeColor, updateTimeAndCountdown, saveTripSettings,
    convertCurrency, setTip, calculateTip, populateDropdown, clearCustomFamilies, updateFamilyFilter,
    initWeatherPill, setWeatherCity, openWeatherModal, closeWeatherModal,
    renderItinerary, renderTravelVault, renderAccommodations, handleFileUpload, renderWallet,
    openCompletionModal, closeCompletionModal, triggerConfetti, triggerEmojiRain, triggerHype,
    spinRoulette, openTipsModal, closeTipsModal, renderTips, openStayModal, closeStayModal,
    openTravelModal, closeTravelModal
} from './ui.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

export function openTab(pageId) {
    if (navigator.vibrate) navigator.vibrate(40); 
    document.querySelectorAll('.tab-content').forEach(tab => { tab.className = 'page tab-content'; });
    const targetPage = document.getElementById(pageId); if(targetPage) targetPage.classList.add('active');
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
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', function() { openTab(this.id.replace('nav-btn-', '')); }));
    document.getElementById('btn-spin-roulette')?.addEventListener('click', spinRoulette);
    document.getElementById('btn-hype')?.addEventListener('click', triggerHype);
    document.querySelectorAll('.tip-btn').forEach(btn => btn.addEventListener('click', function() { setTip(parseInt(this.dataset.tip), this); }));
    document.getElementById('btn-open-admin')?.addEventListener('click', () => openTab('admin'));
    
    // Weather bindings
    document.getElementById('home-weather-pill')?.addEventListener('click', openWeatherModal);
    document.getElementById('btn-close-weather')?.addEventListener('click', closeWeatherModal);
    document.querySelectorAll('.weather-btn').forEach(btn => btn.addEventListener('click', function() { setWeatherCity(this.id.replace('btn-w-', '')); }));
    
    // Modals
    document.getElementById('btn-close-stay')?.addEventListener('click', closeStayModal);
    document.getElementById('btn-close-travel')?.addEventListener('click', closeTravelModal);
    document.getElementById('btn-close-completion-x')?.addEventListener('click', closeCompletionModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCompletionModal);
    document.getElementById('btn-close-tips')?.addEventListener('click', closeTipsModal);
    
    // Settings
    document.getElementById('btn-clear-families')?.addEventListener('click', clearCustomFamilies);
    document.getElementById('btnLight')?.addEventListener('click', () => setThemeMode(false));
    document.getElementById('btnDark')?.addEventListener('click', () => setThemeMode(true));
    document.getElementById('family-selector')?.addEventListener('change', updateFamilyFilter);
    document.getElementById('usd-input')?.addEventListener('input', convertCurrency);
    document.getElementById('bill-total')?.addEventListener('input', calculateTip);
    document.getElementById('split-ways')?.addEventListener('change', calculateTip);
    document.getElementById('wallet-upload')?.addEventListener('change', handleFileUpload);
    
    document.getElementById('btn-force-sync')?.addEventListener('click', async function() { this.innerText = "⏳ Syncing..."; await loadAllData(); populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); preCacheImages(); this.innerText = "✅ Synced!"; setTimeout(() => { this.innerText = "☁️ Sync Data"; }, 2000); });
    document.getElementById('btn-update-version')?.addEventListener('click', () => { if('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => { for(let r of regs) r.update(); }); } window.location.reload(true); });
    
    // Tips & Animations
    document.querySelectorAll('.tips-btn').forEach(btn => btn.addEventListener('click', function() { openTipsModal(this.dataset.city); }));
    document.querySelectorAll('.tips-tab-btn').forEach(btn => btn.addEventListener('click', function() { document.querySelectorAll('.tips-tab-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); renderTips(this.dataset.cat); }));
    document.getElementById('hero-la')?.addEventListener('click', () => triggerEmojiRain('la'));
    document.getElementById('hero-utah')?.addEventListener('click', () => triggerEmojiRain('utah'));
    document.getElementById('hero-vegas')?.addEventListener('click', () => triggerEmojiRain('vegas'));
    
    // Checkbox mapping
    document.getElementById('modal-checkbox')?.addEventListener('change', function() {
        const btn = document.getElementById('btn-confirm-modal'); btn.style.opacity = this.checked ? '1' : '0.5'; btn.style.pointerEvents = this.checked ? 'auto' : 'none';
    });

    document.getElementById('btn-confirm-modal')?.addEventListener('click', async () => {
        const modal = document.getElementById('completion-modal');
        let completedTasks = await getVal('completedTasks') || []; completedTasks.push(modal.dataset.activeTaskId);
        await setVal('completedTasks', completedTasks); syncToCloud('completion', completedTasks); triggerConfetti(); closeCompletionModal(); renderItinerary(); 
    });

    // Master list listener
    document.body.addEventListener('click', async (e) => {
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
        if (stayCard) { openStayModal(stayCard.dataset.fam, stayCard.dataset.addr, stayCard.dataset.map, stayCard.dataset.link, stayCard.dataset.img); return; }

        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName !== 'A') return openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName);
        
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName !== 'A') {
            let tasks = await getVal('completedTasks') || []; tasks = tasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', tasks); renderItinerary();
        }

        const linkBtn = e.target.closest('.link-btn');
        if (linkBtn && linkBtn.dataset.url) window.open(linkBtn.dataset.url, '_blank');

        const deleteDocBtn = e.target.closest('.delete-doc-btn');
        if (deleteDocBtn) {
            e.preventDefault(); e.stopPropagation();
            if(confirm("Delete this document?")) {
                let docs = await getVal('offline_docs') || [];
                docs = docs.filter(d => d.id !== deleteDocBtn.dataset.id);
                await setVal('offline_docs', docs); renderWallet();
            }
        }
    });
}

window.forceAppUpdate = () => { populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); };

async function bootApp() {
    bindEvents();
    initSwipes();
    initPullToRefresh();
    try { state.gateOverrides = await getVal('gateOverrides') || {}; } catch(e) { state.gateOverrides = {}; }
    await loadAllData(); 
    populateDropdown(); 
    renderItinerary(); 
    renderTravelVault(); 
    renderAccommodations(); 
    initLiveCurrency(); 
    updateTimeAndCountdown(); 
    initWeatherPill();
}

bootApp();
