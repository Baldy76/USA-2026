import { state, escapeHTML, parseDateTime } from '../store.js';
import { triggerConfetti } from '../core/animations.js';

export function checkMorningBriefing() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 12) {
        const today = new Date().toDateString();
        if (localStorage.getItem('lastBriefingDate') !== today) {
            openMorningBriefing();
            localStorage.setItem('lastBriefingDate', today);
        }
    }
}

export function openMorningBriefing() {
    document.body.classList.add('no-scroll');
    if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
    const modal = document.getElementById('briefing-modal');
    const now = new Date();
    const user = localStorage.getItem('appUser'); 
    const nameStr = (user && user !== 'All') ? user.split(' ')[0] : "Team";
    const titleEl = document.getElementById('briefing-title-modal');
    if(titleEl) titleEl.innerText = `Good Morning, ${nameStr}!`;
    document.getElementById('briefing-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    const itinContainer = document.getElementById('briefing-itin');
    const todayStr = now.toDateString();
    let todayTasks = [];
    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; 
    const murray = ['david', 'sarah', 'bexs', 'murray'];

    if (state.itineraryData) {
        state.itineraryData.forEach(cols => {
            if(!cols || cols.length < 5) return;
            const d = (cols[0] || '').trim(); const loc = (cols[1] || '').trim(); 
            const act = (cols[2] || '').trim(); const time = (cols[3] || '').trim(); 
            const who = (cols[4] || '').trim();
            let isMatch = false; const whoL = who.toLowerCase(); const filterL = filter.toLowerCase();
            if (filter === 'All' || whoL === 'everyone' || whoL === '') isMatch = true;
            else if (whoL.includes(filterL) || filterL.includes(whoL)) isMatch = true;
            else if (leech.includes(filterL) && whoL.includes('leech')) isMatch = true;
            else if (murray.includes(filterL) && whoL.includes('murray')) isMatch = true;
            if (isMatch) {
                const taskTime = parseDateTime(d, time || '23:59');
                if (taskTime && new Date(taskTime).toDateString() === todayStr) { todayTasks.push({ act, time: time || 'TBD', loc, timestamp: taskTime }); }
            }
        });
    }
    if (todayTasks.length > 0) {
        todayTasks.sort((a, b) => a.timestamp - b.timestamp);
        itinContainer.innerHTML = todayTasks.map(t => `<div style="display:flex; align-items:center; background:rgba(255,255,255,0.6); padding:10px 15px; border-radius:12px; margin-bottom:8px; border:1px solid rgba(0,0,0,0.05);"><strong style="width: 55px; font-size: 14px; color: var(--accent);">${escapeHTML(t.time)}</strong><div style="flex: 1; font-weight: 700; font-size: 15px; color: #1c1c1e;">${escapeHTML(t.act)}</div></div>`).join('');
    } else {
        itinContainer.innerHTML = `<div style="padding: 15px; background:rgba(255,255,255,0.6); border-radius:12px; text-align:center; font-weight:700; color: #1c1c1e; opacity: 0.7;">No fixed plans today. Enjoy the pool! 🏖️</div>`;
    }

    const quoteContainer = document.getElementById('briefing-quote');
    const validQuotes = (state.quotesData || []).filter(q => q[0] !== 'MEETUP' && q[0] !== 'ROULETTE' && q[0] !== 'ROULETTE_RESET' && q[1]);
    if (validQuotes.length > 0) {
        const randQ = validQuotes[Math.floor(Math.random() * validQuotes.length)];
        quoteContainer.innerHTML = `<div style="padding: 15px; background: rgba(255,255,255,0.6); border-radius: 12px; font-style: italic; color: #1c1c1e; border-left: 4px solid var(--accent);">"${escapeHTML(randQ[1])}"<div style="text-align: right; font-weight: 800; font-size: 11px; margin-top: 8px; text-transform: uppercase; font-style: normal; opacity: 0.7;">— ${escapeHTML(randQ[2])}</div></div>`;
    } else {
        quoteContainer.innerHTML = `<div style="font-size: 13px; color: #1c1c1e; opacity: 0.6; text-align: center;">No quotes yet. Say something funny today!</div>`;
    }
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); triggerConfetti(); 
}

export function closeMorningBriefing() {
    const modal = document.getElementById('briefing-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}
