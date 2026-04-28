import { state, getVal } from './store.js';
import { loadAllData, initLiveCurrency, preCacheImages } from './api.js';
import { applyTheme, updateMetaThemeColor } from './core/theme.js';
import { updateTimeAndCountdown, renderUpNext } from './core/clock.js';
import { triggerConfetti, triggerEmojiRain, triggerJackpotMode } from './core/animations.js';
import { populateDropdown, updateFamilyFilter } from './ui.js';
import { renderItinerary } from './features/itinerary.js';
import { renderTravelVault, renderAccommodations, renderAnchor } from './features/travel.js';
import { renderMeetupBoard } from './features/meetup.js';
import { initWheel, renderScoreboard } from './features/roulette.js';
import { initWeatherPill } from './features/weather.js';
import { checkMorningBriefing } from './features/briefing.js';

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
        localStorage.setItem('appUser', this.value);
        loginSelector.style.display = 'none';
        splashGoBtn.innerText = `Let's go, ${this.value}! ✈️`;
        splashGoBtn.style.display = 'block';
        updateFamilyFilter();
    });

    splashGoBtn.addEventListener('click', () => {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; checkMorningBriefing(); }, 300);
    });
}

async function bootApp() {
    handleSplashLogic();
    if(!navigator.onLine) document.getElementById('offline-banner').classList.add('active');
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
    
    await loadAllData();
    
    populateDropdown(); renderItinerary(); renderTravelVault(); renderAccommodations(); 
    renderAnchor(); renderMeetupBoard(); renderUpNext(); 
    initLiveCurrency(); initWeatherPill(); preCacheImages();
    updateTimeAndCountdown(); setInterval(updateTimeAndCountdown, 10000);
    if (document.getElementById('roulette-wheel')) { initWheel(); renderScoreboard(); }
}

document.addEventListener('DOMContentLoaded', bootApp);
