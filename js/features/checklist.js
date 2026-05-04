import { state, getVal, setVal } from '../store.js';

export async function openChecklistModal() {
    renderChecklist();
    const modal = document.getElementById('checklist-modal');
    if (modal) { 
        modal.style.display = 'flex'; 
        setTimeout(() => modal.classList.add('active'), 10); 
    }
}

export function closeChecklistModal() {
    const modal = document.getElementById('checklist-modal');
    if (modal) { 
        modal.classList.remove('active'); 
        setTimeout(() => modal.style.display = 'none', 300); 
    }
}

export async function renderChecklist() {
    const listEl = document.getElementById('checklist-items');
    if (!listEl) return;

    const currentUser = localStorage.getItem('appUser') || 'All';
    const doneItems = await getVal('checklist_done') || [];

    let html = '';
    const data = state.checklistData || [];

    let itemCount = 0;
    data.forEach(row => {
        if(row.length < 2) return;
        const who = (row[0] || '').trim();
        const task = (row[1] || '').trim();
        
        if (!matchUser(who, currentUser)) return;

        // Use base64 encoding to create a safe, unique ID for the task
        const taskId = btoa(encodeURIComponent(task)).substring(0, 15);
        const isChecked = doneItems.includes(taskId) ? 'checked' : '';
        
        html += `
            <div class="checklist-item ${isChecked}" data-id="${taskId}" style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(0,0,0,0.03); border-radius: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s ease;">
                <div class="check-circle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${isChecked ? 'var(--accent)' : 'var(--ios-grey)'}; background: ${isChecked ? 'var(--accent)' : 'transparent'}; color: white; display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: bold; flex-shrink: 0;">
                    ${isChecked ? '✓' : ''}
                </div>
                <span style="${isChecked ? 'text-decoration: line-through; opacity: 0.5;' : ''} font-size: 16px; font-weight: 600;">${task}</span>
            </div>
        `;
        itemCount++;
    });

    if(itemCount === 0) html = '<div style="opacity:0.5; padding: 20px; text-align:center; font-weight: bold;">All clear! Nothing to do.</div>';
    listEl.innerHTML = html;
}

export async function toggleChecklistItem(id) {
    let doneItems = await getVal('checklist_done') || [];
    if (doneItems.includes(id)) {
        doneItems = doneItems.filter(i => i !== id);
    } else {
        doneItems.push(id);
        if(navigator.vibrate) navigator.vibrate(20);
    }
    await setVal('checklist_done', doneItems);
    renderChecklist();
}

export async function resetChecklist() {
    if(confirm("Clear all checked items?")) {
        await setVal('checklist_done', []);
        renderChecklist();
    }
}

// Universal Filter Logic
function matchUser(whoStr, userFilter) {
    const w = whoStr.toLowerCase();
    const u = userFilter.toLowerCase();
    
    if (u === 'all' || w === 'everyone' || w === '') return true;
    if (w.includes(u) || u.includes(w)) return true;
    
    const leech = ['graeme', 'dawn', 'grace'];
    const murray = ['david', 'sarah', 'bexs'];
    
    if (u === 'leech family' && (w.includes('leech') || leech.some(n=>w.includes(n)))) return true;
    if (u === 'murray family' && (w.includes('murray') || murray.some(n=>w.includes(n)))) return true;
    if (leech.includes(u) && w.includes('leech')) return true;
    if (murray.includes(u) && w.includes('murray')) return true;
    
    return false;
}
