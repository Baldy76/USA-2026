import { loadAllData, initLiveCurrency, preCacheImages } from './api.js';
import { applyTheme } from './core/theme.js';
import { updateTimeAndCountdown } from './core/clock.js';
import { populateDropdown, updateFamilyFilter } from './ui.js';
import { renderItinerary } from './features/itinerary.js';
import { renderTravelVault, renderAccommodations } from './features/travel.js';
import { initWeatherPill } from './features/weather.js';
import { checkMorningBriefing, closeMorningBriefing } from './features/briefing.js';

async function bootApp() {
    applyTheme(localStorage.getItem('HolidayPlanner_Theme') === 'true');
    await loadAllData();
    populateDropdown();
    renderItinerary();
    renderTravelVault();
    renderAccommodations();
    initWeatherPill();
    updateTimeAndCountdown();
    
    // Splash Logic
    const splash = document.getElementById('splash');
    const loginSelector = document.getElementById('login-selector');
    const splashGoBtn = document.getElementById('splash-go-btn');
    const saved = localStorage.getItem('appUser');

    if (saved) {
        loginSelector.style.display = 'none';
        splashGoBtn.innerText = `Let's go, ${saved}!`;
        splashGoBtn.style.display = 'block';
    }

    loginSelector.addEventListener('change', function() {
        localStorage.setItem('appUser', this.value);
        loginSelector.style.display = 'none';
        splashGoBtn.innerText = `Let's go, ${this.value}!`;
        splashGoBtn.style.display = 'block';
        updateFamilyFilter();
    });

    splashGoBtn.addEventListener('click', () => {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; checkMorningBriefing(); }, 300);
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.id.replace('nav-btn-', '');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(page).classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('btn-close-briefing').addEventListener('click', closeMorningBriefing);
}

document.addEventListener('DOMContentLoaded', bootApp);
