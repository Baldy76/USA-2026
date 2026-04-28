import { state } from './store.js';
import { renderItinerary } from './features/itinerary.js';
import { renderTravelVault, renderAccommodations } from './features/travel.js';
import { updateTimeAndCountdown } from './core/clock.js';

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    new Set(state.sheetFamilies).forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt);
    });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() {
    localStorage.setItem('appUser', document.getElementById('family-selector').value);
    renderItinerary(); renderTravelVault(); renderAccommodations(); updateTimeAndCountdown();
}
