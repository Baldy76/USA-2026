import { state } from './store.js';
import { renderItinerary } from './features/itinerary.js';
import { renderTravelVault, renderAccommodations } from './features/travel.js';
import { updateGreeting, updateTimeAndCountdown, renderUpNext } from './core/clock.js';

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); 
    if(!sel) return;
    
    sel.innerHTML = '<option value="All">Show All</option>';
    const families = state.sheetFamilies || [];
    
    new Set(families).forEach(f => { 
        const opt = document.createElement('option'); 
        opt.value = f; 
        opt.textContent = f; 
        sel.appendChild(opt); 
    });
    
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { 
    localStorage.setItem('appUser', document.getElementById('family-selector').value); 
    renderItinerary(); 
    renderTravelVault(); 
    renderAccommodations(); 
    updateGreeting(); 
    renderUpNext(); 
}

export function clearCustomFamilies() { 
    if(confirm("Remove all old saved names?")) { 
        localStorage.removeItem('appUser'); 
        window.location.reload(); 
    } 
}

export function saveTripSettings() { 
    localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); 
    localStorage.setItem('tripEndDate', document.getElementById('trip-end-date').value); 
    updateTimeAndCountdown(); 
}
