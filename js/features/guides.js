
import { state, escapeHTML } from '../store.js';

export function openTipsModal(city) {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const titles = { 'la': 'Los Angeles', 'utah': 'Utah', 'vegas': 'Las Vegas' };
    document.getElementById('tips-modal-title').innerHTML = `💡 ${titles[city.toLowerCase()]} Tips`;
    document.querySelectorAll('.tips-tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.cat === 'eating'); });
    const modal = document.getElementById('tips-modal'); modal.dataset.city = city.toLowerCase();
    renderTips('eating'); modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeTipsModal() { document.getElementById('tips-modal').classList.remove('active'); setTimeout(() => { document.getElementById('tips-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); }

export function renderTips(category) {
    if (!state.vaultAndStaysData) return;
    const currentTipsCity = document.getElementById('tips-modal').dataset.city;
    const filter = localStorage.getItem('appUser') || 'All';
    const leech = ['graeme', 'dawn', 'grace', 'leech']; const murray = ['david', 'sarah', 'bexs', 'murray'];

    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 5) return; 
        const fam = (cols[0] || '').trim(); const type = (cols[1] || '').trim().toLowerCase(); 
        const city = (cols[2] || '').trim().toLowerCase(); const cat = (cols[3] || '').trim().toLowerCase(); const details = (cols[4] || '').trim();
        
        let isMatch = false; const famL = fam.toLowerCase(); const filterL = filter.toLowerCase();
        if (filter === 'All' || famL === 'everyone') isMatch = true; 
        else if (famL.includes(filterL) || filterL.includes(famL)) isMatch = true; 
        else if (leech.includes(filterL) && famL.includes('leech')) isMatch = true; 
        else if (murray.includes(filterL) && famL.includes('murray')) isMatch = true;

        if (type === 'tip' && city.includes(currentTipsCity) && cat === category && isMatch) {
            const badge = fam.toLowerCase() !== 'everyone' ? `<span style="background: var(--accent-gradient); padding: 4px 10px; border-radius: 12px; color: white; font-size: 11px; font-weight: 800; display: inline-block; margin-top: 8px;">👤 ${escapeHTML(fam)}</span>` : '';
            html += `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);"><div style="font-size: 15px; font-weight: 500; line-height: 1.6; white-space: pre-wrap; color: var(--text);">${escapeHTML(details)}</div><div style="font-size: 11px; font-weight: 800; opacity:0.6; margin-top: 10px;">👤 ${escapeHTML(fam)}</div></div>`;
        }
    }); 
    document.getElementById('tips-content').innerHTML = html || `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">👻</span><div class="empty-text" style="font-size: 16px;">No tips saved!</div></div>`;
}

export function openVegasFoodModal() {
    document.body.classList.add('no-scroll'); if(navigator.vibrate) navigator.vibrate(40);
    const modal = document.getElementById('vegas-food-modal');
    document.querySelectorAll('.vegas-food-tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.cat === 'Nice'); });
    renderVegasFoodList('Nice');
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeVegasFoodModal() { 
    const modal = document.getElementById('vegas-food-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300); 
}

export function renderVegasFoodList(category) {
    const content = document.getElementById('vegas-food-content');
    if (!state.vaultAndStaysData) {
        content.innerHTML = `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">🍽️</span><div class="empty-text" style="font-size: 16px;">No data loaded yet!</div></div>`;
        return;
    }
    
    let html = '';
    state.vaultAndStaysData.forEach(cols => {
        if(!cols || cols.length < 6) return; 
        const type = (cols[1] || '').trim().toLowerCase(); 
        const cat = (cols[2] || '').trim().toLowerCase(); 
        
        if (type === 'vegasfood' && cat === category.toLowerCase()) {
            const name = escapeHTML(cols[3] || '');
            const vibe = escapeHTML(cols[4] || '');
            const reasoning = escapeHTML(cols[5] || '');
            
            html += `<div class="admin-card" style="padding: 18px; margin-bottom: 12px; background: rgba(0,0,0,0.03); border: 2px solid var(--ios-grey);">
                <div style="font-size: 18px; font-weight: 900; margin-bottom: 6px; color: var(--text);">${name}</div>
                ${vibe ? `<div style="font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #ff9500, #ff3b30); color: white; display: inline-block; padding: 4px 10px; border-radius: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">✨ ${vibe}</div>` : ''}
                <div style="font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--text); opacity: 0.9;">${reasoning}</div>
            </div>`;
        }
    }); 
    content.innerHTML = html || `<div class="empty-state" style="padding: 30px 10px;"><span class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">🍽️</span><div class="empty-text" style="font-size: 16px; margin-bottom: 10px;">Add data to Google Sheets!</div><div style="font-size:11px; opacity:0.7;">Make sure Type is "<b>vegasfood</b>" and Category is "<b>${escapeHTML(category)}</b>"</div></div>`;
}

export function openNavChoiceModal(query, lat, lon, contextLoc = '') {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('nav-choice-modal');
    modal.dataset.query = query || '';
    modal.dataset.lat = lat || '';
    modal.dataset.lon = lon || '';
    
    const qLower = (query || '').toLowerCase();
    const cLower = (contextLoc || '').toLowerCase();
    
    const showTrails = cLower.includes('utah') || qLower.includes('death valley') || cLower.includes('death valley');
    const trailsBtn = document.getElementById('btn-nav-alltrails');
    const topRow = document.getElementById('nav-top-row');
    
    if (trailsBtn && topRow) {
        if (showTrails) {
            trailsBtn.style.display = 'block';
            topRow.style.gridTemplateColumns = '1fr 1fr 1fr';
        } else {
            trailsBtn.style.display = 'none';
            topRow.style.gridTemplateColumns = '1fr 1fr';
        }
    }

    const showUber = cLower.includes('vegas') || qLower.includes('vegas');
    const uberBtn = document.getElementById('btn-nav-uber');
    
    if (uberBtn) {
        if (showUber) {
            uberBtn.style.display = 'block';
        } else {
            uberBtn.style.display = 'none';
        }
    }

    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeNavChoiceModal() {
    const modal = document.getElementById('nav-choice-modal');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}
