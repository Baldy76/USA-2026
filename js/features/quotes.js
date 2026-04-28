
import { state, escapeHTML } from '../store.js';
import { saveQuoteToSheet, deleteQuoteFromSheet } from '../api.js';
import { triggerConfetti } from '../core/animations.js';

export function openQuoteModal(location) {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('quote-modal'); modal.dataset.location = location;
    document.getElementById('quote-modal-title').innerText = `💬 ${location === 'la' ? 'Los Angeles' : location === 'vegas' ? 'Las Vegas' : location.toUpperCase()} Quotes`;
    document.getElementById('new-quote-author').value = ''; document.getElementById('new-quote-text').value = '';
    renderQuotes(location); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function renderQuotes(location) {
    const list = document.getElementById('quote-list');
    const filtered = (state.quotesData || []).filter(q => q[0] && q[0].toLowerCase() === location.toLowerCase());
    if (filtered.length === 0) { list.innerHTML = `<div class="empty-state" style="padding: 20px;"><div class="empty-text">No quotes yet.</div></div>`; return; }
    list.innerHTML = filtered.map(q => `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--ios-grey);"><div style="font-family: 'Georgia', serif; font-style: italic; font-size: 16px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; color: var(--text);">"${escapeHTML(q[1])}"</div><div style="text-align: right; font-size: 11px; font-weight: 800; opacity: 0.6; text-transform: uppercase;">— ${escapeHTML(q[2])}</div></div>`).reverse().join('');
}

export async function submitNewQuote() {
    const author = document.getElementById('new-quote-author').value.trim(); const text = document.getElementById('new-quote-text').value.trim();
    const loc = document.getElementById('quote-modal').dataset.location;
    if (!text || !author) { alert("Please enter both who said it and what they said!"); return; }
    if (navigator.vibrate) navigator.vibrate(20);
    await saveQuoteToSheet(loc, text, author);
    document.getElementById('new-quote-author').value = ''; document.getElementById('new-quote-text').value = '';
    renderQuotes(loc); triggerConfetti();
}

export function closeQuoteModal() { document.getElementById('quote-modal').classList.remove('active'); setTimeout(() => { document.getElementById('quote-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function openManageQuotesModal() { 
    document.body.classList.add('no-scroll'); 
    renderAdminQuotes(); 
    document.getElementById('manage-quotes-modal').style.display = 'flex'; 
    setTimeout(() => document.getElementById('manage-quotes-modal').classList.add('active'), 10); 
}

export function closeManageQuotesModal() { document.getElementById('manage-quotes-modal').classList.remove('active'); setTimeout(() => { document.getElementById('manage-quotes-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderAdminQuotes() {
    const list = document.getElementById('admin-quotes-list');
    const validQuotes = (state.quotesData || []).filter(q => { const loc = (q[0] || '').toUpperCase(); return loc !== 'MEETUP' && loc !== 'ROULETTE' && loc !== 'ROULETTE_RESET'; });
    if (validQuotes.length === 0) { list.innerHTML = `<div class="empty-state" style="padding: 20px;">No quotes to manage.</div>`; return; }
    list.innerHTML = validQuotes.map((q, index) => `<div style="background: var(--bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--ios-grey);"><div style="flex: 1; padding-right: 10px;"><div style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--text);">"${escapeHTML(q[1])}"</div><div style="font-size: 11px; opacity: 0.6; color: var(--text);">— ${escapeHTML(q[2])} (${escapeHTML(q[0]).toUpperCase()})</div></div><button class="delete-quote-btn" data-loc="${escapeHTML(q[0])}" data-quote="${escapeHTML(q[1])}" data-author="${escapeHTML(q[2])}" style="background: #ff3b30; color: white; border: none; border-radius: 8px; padding: 10px 12px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3);">🗑️</button></div>`).reverse().join('');
}
