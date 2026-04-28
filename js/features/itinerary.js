
import { state, setVal, getVal, escapeHTML, parseDateTime } from '../store.js';
import { syncToCloud } from '../api.js';
import { triggerConfetti } from '../core/animations.js';
import { renderUpNext } from '../core/time.js';

export async function renderItinerary() {
    if (!state.itineraryData) return;
    const filter = localStorage.getItem('appUser') || 'All'; 
    const completedTasks = await getVal('completedTasks') || [];
    const grouped = { 'la': {}, 'utah': {}, 'vegas': {} }; 
    let cLA = '', cUtah = '', cVegas = ''; 
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    const now = new Date(); const nowTime = now.getTime(); const todayStr = now.toDateString(); 
    const sortedData = [...state.itineraryData].sort((a, b) => (parseDateTime(a[0] || '', a[3] || '23:59') || Number.MAX_SAFE_INTEGER) - (parseDateTime(b[0] || '', b[3] || '23:59') || Number.MAX_SAFE_INTEGER));

    sortedData.forEach(cols => {
        if(!cols || cols.length < 5) return;
        const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); const who = (cols[4] || '').trim(); const addr = (cols.length >= 6) ? (cols[5] || '').trim() : '';
        
        let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true; 
        else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true; 
        else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;

        if (isMatch) {
            const mapQuery = addr || `${act} ${loc}`;
            const taskId = btoa(encodeURIComponent(`${d}-${loc}-${act}-${time}`)).replace(/=/g, ''); 
            const isCompleted = completedTasks.includes(taskId);
            
            let isHappening = false; const taskDateObj = parseDateTime(d, time);
            if (taskDateObj && !isCompleted && nowTime >= taskDateObj && nowTime < taskDateObj + (90 * 60000)) isHappening = true;
            
            let cardClass = isCompleted ? 'itin-card completed' : 'itin-card';
            if (isHappening) cardClass += ' happening-now';
            
            let badgeHtml = isCompleted ? `<span style="background: #34c759; padding: 4px 12px; border-radius: 20px; color: white; font-size: 11px; font-weight: 900;">✅ DONE</span>` : `<span style="background: var(--ios-grey); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">${escapeHTML(who)}</span>`;
            let extraLabel = isHappening ? `<div style="color: var(--accent); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">🚀 Happening Now</div>` : '';

            let disneyBtn = '';
            if (act.toLowerCase().includes('disney')) {
                disneyBtn = `<div class="disney-app-btn pulse-btn" style="font-size: 12px; font-weight: 800; background: linear-gradient(135deg, #007aff, #5856d6); color: white; padding: 6px 12px; border-radius: 12px; cursor: pointer; display: inline-flex; align-items: center; box-shadow: 0 4px 10px rgba(0, 122, 255, 0.3); margin-left: 10px;">🏰 Park App</div>`;
            }

            const cardHtml = `
                <div class="timeline-card-wrapper ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="admin-card ${cardClass}" data-task-id="${taskId}" data-task-name="${escapeHTML(act)}" style="padding: 20px; margin-bottom: 16px; cursor: pointer;">
                        ${extraLabel}
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 15px; font-weight: 800;">${escapeHTML(time)}</strong>${badgeHtml}
                        </div>
                        <div class="itin-title" style="font-size: 17px; font-weight: 900; line-height: 1.3;">${escapeHTML(act)}</div>
                        <div style="margin-top: 10px; display: flex; align-items: center;">
                            ${addr || act ? `<div class="nav-trigger-btn" data-query="${escapeHTML(mapQuery)}" data-loc="${escapeHTML(loc.toLowerCase())}" style="font-size: 13px; font-weight: 800; opacity: 0.9; color: var(--accent); cursor: pointer; display: inline-block;">📍 Get Directions ↗</div>` : ''}
                            ${disneyBtn}
                        </div>
                    </div>
                </div>`;

            const pg = (city, date) => { if (!grouped[city][date]) grouped[city][date] = []; grouped[city][date].push(cardHtml); };
            if (loc.toLowerCase().includes('la')) { isCompleted ? cLA += cardHtml : pg('la', d); }
            else if (loc.toLowerCase().includes('utah')) { isCompleted ? cUtah += cardHtml : pg('utah', d); }
            else if (loc.toLowerCase().includes('vegas')) { isCompleted ? cVegas += cardHtml : pg('vegas', d); }
        }
    });

    const buildSec = (cityObj) => {
        let html = ''; for (const [date, cards] of Object.entries(cityObj)) {
            let isOpen = (!isNaN(new Date(date)) && new Date(date).toDateString() === todayStr) ? 'open' : '';
            html += `<details class="day-group" ${isOpen}><summary class="date-divider"><span class="sticky-date">${escapeHTML(date)} <span class="item-count">${cards.length}</span></span></summary><div class="day-content timeline">${cards.join('')}</div></details>`;
        } return html;
    };
    document.getElementById('la-itinerary').innerHTML = buildSec(grouped['la']); document.getElementById('la-completed-list').innerHTML = cLA ? `<div class="timeline">${cLA}</div>` : '';
    document.getElementById('utah-itinerary').innerHTML = buildSec(grouped['utah']); document.getElementById('utah-completed-list').innerHTML = cUtah ? `<div class="timeline">${cUtah}</div>` : '';
    document.getElementById('vegas-itinerary').innerHTML = buildSec(grouped['vegas']); document.getElementById('vegas-completed-list').innerHTML = cVegas ? `<div class="timeline">${cVegas}</div>` : '';
    document.querySelectorAll('.completed-section').forEach(sec => { sec.style.display = sec.querySelector('.timeline')?.innerHTML ? 'block' : 'none'; });
}

export function openCompletionModal(taskId, taskName) {
    document.body.classList.add('no-scroll');
    document.getElementById('modal-task-name').innerText = taskName; document.getElementById('modal-checkbox').checked = false;
    document.getElementById('btn-confirm-modal').style.opacity = '0.5'; document.getElementById('btn-confirm-modal').style.pointerEvents = 'none';
    const modal = document.getElementById('completion-modal'); modal.dataset.activeTaskId = taskId;
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); 
}

export function closeCompletionModal() {
    const modal = document.getElementById('completion-modal'); modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}
