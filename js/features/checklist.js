import { state, getVal, setVal, escapeHTML } from '../store.js';
import { triggerConfetti } from '../ui.js';

export async function renderChecklist() {
    const content = document.getElementById('checklist-content');
    if (!content) return;

    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech'];
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    let items = [];
    (state.checklistData || []).forEach(cols => {
        if(!cols || cols.length < 2) return;
        const fam = (cols[0] || '').trim();
        const itemText = (cols[1] || '').trim();

        if (itemText) {
            let isMatch = false; const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
            if (filter === 'All' || famL === 'everyone' || famL === '') isMatch = true;
            else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true;
            else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true;
            else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;

            if (isMatch) {
                items.push({ id: btoa(encodeURIComponent(itemText)).substring(0, 20), text: itemText, fam: fam });
            }
        }
    });

    if (items.length === 0) {
        content.innerHTML = `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">🎒</span><div class="empty-text">No items to pack! Add data to the Checklist sheet.</div></div>`;
        return;
    }

    const completed = await getVal('packedItems') || [];
    let pendingHtml = ''; let packedHtml = '';

    items.forEach(item => {
        const isDone = completed.includes(item.id);
        const badge = (item.fam && item.fam.toLowerCase() !== 'everyone') ? `<span style="background: var(--ios-grey); color: var(--text); padding: 2px 6px; border-radius: 8px; font-size: 9px; font-weight: 800; margin-left: 8px; vertical-align: middle;">${escapeHTML(item.fam)}</span>` : '';
        
        const card = `
            <div class="checklist-item admin-card" data-id="${item.id}" style="padding: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: all 0.2s ease; ${isDone ? 'opacity: 0.5; background: rgba(0,0,0,0.02);' : 'background: var(--bg);'} border: 1px solid var(--ios-grey);">
                <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${isDone ? '#34c759' : 'var(--ios-grey)'}; background: ${isDone ? '#34c759' : 'transparent'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; flex-shrink: 0;">
                    ${isDone ? '✓' : ''}
                </div>
                <div style="flex: 1; font-size: 15px; font-weight: 600; text-decoration: ${isDone ? 'line-through' : 'none'};">${escapeHTML(item.text)}${badge}</div>
            </div>
        `;

        if (isDone) packedHtml += card; else pendingHtml += card;
    });

    content.innerHTML = (pendingHtml ? `<div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; padding-left: 5px;">To Pack</div>${pendingHtml}` : '') + 
                        (packedHtml ? `<div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #34c759; margin: 20px 0 10px; padding-left: 5px;">Packed ✅</div>${packedHtml}` : '');
}

export async function toggleChecklistItem(id) {
    let completed = await getVal('packedItems') || [];
    if (completed.includes(id)) { completed = completed.filter(i => i !== id); if (navigator.vibrate) navigator.vibrate(10); } 
    else {
        completed.push(id); if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
        // Confetti logic simplified for stability
        if (completed.length > 5 && completed.length % 5 === 0) setTimeout(triggerConfetti, 300);
    }
    await setVal('packedItems', completed);
    renderChecklist();
}

export function openChecklistModal() { document.body.classList.add('no-scroll'); renderChecklist(); const modal = document.getElementById('checklist-modal'); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); }
export function closeChecklistModal() { const modal = document.getElementById('checklist-modal'); modal.classList.remove('active'); setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }
export async function resetChecklist() { if(confirm("Uncheck all items and start over?")) { await setVal('packedItems', []); renderChecklist(); if (navigator.vibrate) navigator.vibrate(20); } }
