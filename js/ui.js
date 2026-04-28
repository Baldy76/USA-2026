import { state } from './store.js';

export function populateDropdown() {
    const sel = document.getElementById('family-selector'); if(!sel) return;
    sel.innerHTML = '<option value="All">Show All</option>';
    new Set(state.sheetFamilies || []).forEach(f => { const opt = document.createElement('option'); opt.value = f; opt.textContent = f; sel.appendChild(opt); });
    sel.value = localStorage.getItem('appUser') || 'All';
}

export function updateFamilyFilter() { 
    localStorage.setItem('appUser', document.getElementById('family-selector').value); 
    window.location.reload(); // Temporary heavy hammer to ensure everything refreshes
}

export function clearCustomFamilies() { if(confirm("Remove saved names?")) { localStorage.removeItem('appUser'); window.location.reload(); } }
export function saveTripSettings() { localStorage.setItem('tripStartDate', document.getElementById('trip-start-date').value); localStorage.setItem('tripEndDate', document.getElementById('trip-end-date').value); window.location.reload(); }
