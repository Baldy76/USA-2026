import { state, setVal, getVal } from './store.js';
import { loadAllData, initLiveCurrency, fetchWeather } from './api.js';
import { renderItinerary, renderTravelVault, renderAccommodations, shareDay, openScratchpad, closeScratchpad, saveScratchpad, openCompletionModal, closeCompletionModal } from './ui.js';

const tabOrder = ['la', 'utah', 'home', 'vegas', 'flights'];

// ---- ROUTER & NATIVE BACK BUTTON ----
function openTab(pageId, isPopState = false) {
    if (navigator.vibrate) navigator.vibrate(40); 
    
    const activeTab = document.querySelector('.tab-content.active');
    let animClass = 'fade-pop'; // Default for direct clicks
    
    // Directional Swipe calculation
    if (activeTab && tabOrder.includes(activeTab.id) && tabOrder.includes(pageId)) {
        const curIdx = tabOrder.indexOf(activeTab.id);
        const newIdx = tabOrder.indexOf(pageId);
        animClass = newIdx > curIdx ? 'slide-right' : 'slide-left';
    }

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.className = 'page tab-content'; // Reset classes
    });

    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active', animClass);

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('nav-btn-' + pageId); 
    if(activeBtn) activeBtn.classList.add('active');

    document.body.className = `light-mode theme-${pageId === 'home' ? 'splash' : pageId}`;
    window.scrollTo(0,0); 

    // History API (Back Button Support)
    if (!isPopState) {
        history.pushState({ pageId: pageId }, '', `#${pageId}`);
    }
}

// Intercept Physical Phone Back Button
window.addEventListener('popstate', (event) => {
    // If a modal is open, back button closes it instead of changing tabs
    const scratchModal = document.getElementById('scratchpad-modal');
    if (scratchModal && scratchModal.classList.contains('active')) { closeScratchpad(); return; }
    
    if (event.state && event.state.pageId) {
        openTab(event.state.pageId, true);
    } else {
        openTab('home', true);
    }
});

// ---- PULL TO REFRESH ----
function initPullToRefresh() {
    let pStart = 0;
    const spinner = document.getElementById('ptr-spinner');
    document.addEventListener('touchstart', e => {
        if (window.scrollY === 0) pStart = e.touches[0].clientY;
    }, {passive: true});
    
    document.addEventListener('touchend', e => {
        if (window.scrollY === 0 && pStart > 0) {
            if (e.changedTouches[0].clientY - pStart > 150) {
                spinner.classList.add('refreshing');
                if (navigator.vibrate) navigator.vibrate(50);
                loadAllData().then(() => {
                    renderItinerary();
                    setTimeout(() => spinner.classList.remove('refreshing'), 1000);
                });
            }
        }
        pStart = 0;
    }, {passive: true});
}

// ---- SWIPE ENGINE ----
function initSwipes() {
    let touchstartX = 0; let touchendX = 0;
    const mainContent = document.getElementById('content');
    if (!mainContent) return;
    
    mainContent.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
    mainContent.addEventListener('touchend', e => { 
        touchendX = e.changedTouches[0].screenX; 
        const dist = touchendX - touchstartX;
        if (Math.abs(dist) < 60) return; // threshold
        
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab || !tabOrder.includes(activeTab.id)) return; 
        const currentIndex = tabOrder.indexOf(activeTab.id);

        if (dist < 0 && currentIndex < tabOrder.length - 1) openTab(tabOrder[currentIndex + 1]); // Swiped Left
        else if (dist > 0 && currentIndex > 0) openTab(tabOrder[currentIndex - 1]); // Swiped Right
    }, { passive: true });
}

// ---- EVENT BINDING ----
function bindEvents() {
    // Splash screen button
    document.getElementById('splash-go-btn')?.addEventListener('click', () => {
        openTab('home');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', function() { openTab(this.id.replace('nav-btn-', '')); }));
    document.getElementById('btn-share-today')?.addEventListener('click', () => shareDay('today-itinerary', "Today's"));
    document.getElementById('btn-share-tomorrow')?.addEventListener('click', () => shareDay('tomorrow-itinerary', "Tomorrow's"));
    
    // Scratchpad events
    document.getElementById('btn-open-scratchpad')?.addEventListener('click', openScratchpad);
    document.getElementById('btn-close-scratchpad')?.addEventListener('click', closeScratchpad);
    document.getElementById('scratchpad-text')?.addEventListener('input', saveScratchpad);

    // Modals
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCompletionModal);
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
            closeCompletionModal(); renderItinerary(); 
        }
    });

    document.body.addEventListener('click', async (e) => {
        const activeCard = e.target.closest('.itin-card:not(.completed)');
        if (activeCard && e.target.tagName.toLowerCase() !== 'a') return openCompletionModal(activeCard.dataset.taskId, activeCard.dataset.taskName);
        
        const completedCard = e.target.closest('.itin-card.completed');
        if (completedCard && e.target.tagName.toLowerCase() !== 'a') {
            let completedTasks = await getVal('completedTasks') || [];
            completedTasks = completedTasks.filter(id => id !== completedCard.dataset.taskId);
            await setVal('completedTasks', completedTasks); renderItinerary();
        }
    });

    // Offline Tracker
    window.addEventListener('offline', () => document.getElementById('offline-banner').classList.add('active'));
    window.addEventListener('online', () => {
        document.getElementById('offline-banner').classList.remove('active');
        loadAllData().then(() => renderItinerary()); // Auto-sync when back online
    });
}

// ---- BOOTSTRAP ----
window.addEventListener('load', async () => {
    bindEvents();
    initSwipes();
    initPullToRefresh();
    
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');

    // Sets the splash screen as the root history state
    history.replaceState({ pageId: 'splash' }, '', '#splash');
    
    await loadAllData();
    renderItinerary();
    initLiveCurrency();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.error(e));
