import { state, setVal, getVal, escapeHTML } from '../store.js?v=7.0.0';
import { saveQuoteToSheet, deleteQuoteFromSheet } from '../api.js?v=7.0.0';
import { triggerConfetti } from '../ui.js?v=7.0.0';

export async function renderMeetupBoard() {
    const board = document.getElementById('btn-open-meetup');
    const boardText = document.getElementById('meetup-text');
    const boardAuthor = document.getElementById('meetup-author');
    const statusLabel = document.getElementById('meetup-status-label');
    if (!boardText || !board) return;

    const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
    if (meetups.length > 0) {
        const latest = meetups[meetups.length - 1]; 
        const messageId = btoa(latest[1] + latest[2]).substring(0, 12);
        const lastSeenId = await getVal('lastSeenMeetupId');
        const currentUser = localStorage.getItem('appUser') || 'Unknown';
        const isUrgent = latest[1].includes('[ALERT]');
        const cleanText = latest[1].replace('[ALERT]', '').trim();

        boardText.innerText = `"${escapeHTML(cleanText)}"`;
        boardAuthor.innerText = `— ${escapeHTML(latest[2])}`;

        if (messageId !== lastSeenId) {
            board.classList.add('new-alert-pulse');
            if(statusLabel) statusLabel.innerText = "NEW ANNOUNCEMENT";
            
            // Only trigger physical feedback if you aren't the author
            if (latest[2] !== currentUser) {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                if (Notification.permission === 'granted') {
                    new Notification(isUrgent ? '🚨 URGENT MEETUP' : '📢 Meetup Update', { body: cleanText, icon: 'img/icon-192.png' });
                }
                if (isUrgent) {
                    const overlay = document.getElementById('urgent-alert-overlay');
                    if(overlay && overlay.style.display === 'none') {
                        document.getElementById('urgent-alert-msg').innerText = `${cleanText}\n\n— ${latest[2]}`;
                        overlay.style.display = 'flex';
                        if (navigator.vibrate) navigator.vibrate([500, 100, 500, 100, 500]);
                    }
                }
            }
        } else {
            board.classList.remove('new-alert-pulse');
            if(statusLabel) statusLabel.innerText = "Live Bulletin";
        }
    } else {
        boardText.innerText = "No active announcements.";
        boardAuthor.innerText = "Tap here to broadcast a message to the group!";
        board.classList.remove('new-alert-pulse');
        if(statusLabel) statusLabel.innerText = "Live Bulletin";
    }
}

export function openMeetupModal() {
    document.body.classList.add('no-scroll');
    const modal = document.getElementById('meetup-modal');
    document.getElementById('new-meetup-author').value = localStorage.getItem('appUser') || '';
    document.getElementById('new-meetup-text').value = '';
    const urgentToggle = document.getElementById('urgent-toggle');
    if(urgentToggle) urgentToggle.checked = false;
    
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
}

export function closeMeetupModal() {
    const modal = document.getElementById('meetup-modal');
    modal.classList.remove('active'); 
    setTimeout(() => { modal.style.display = 'none'; document.body.classList.remove('no-scroll'); }, 300);
}

export async function submitMeetup() {
    const author = document.getElementById('new-meetup-author').value.trim();
    let text = document.getElementById('new-meetup-text').value.trim();
    const urgentToggle = document.getElementById('urgent-toggle');
    const isUrgent = urgentToggle ? urgentToggle.checked : false;
    
    if (!text || !author) { alert("Please enter both your name and the announcement!"); return; }
    if (isUrgent) text = `[ALERT] ${text}`;
    
    if (navigator.vibrate) navigator.vibrate(20);
    
    const btn = document.getElementById('btn-save-meetup');
    btn.innerText = "Posting..."; btn.disabled = true;
    
    await saveQuoteToSheet('MEETUP', text, author);
    
    const messageId = btoa(text + author).substring(0, 12);
    await setVal('lastSeenMeetupId', messageId);
    
    btn.innerText = "Post Announcement"; btn.disabled = false;
    document.getElementById('new-meetup-author').value = ''; document.getElementById('new-meetup-text').value = '';
    if (urgentToggle) urgentToggle.checked = false;
    
    renderMeetupBoard(); triggerConfetti(); closeMeetupModal();
}

export async function clearActiveMeetup() {
    const meetups = (state.quotesData || []).filter(q => q[0] === 'MEETUP');
    if (meetups.length > 0) {
        if(confirm("Clear the current active bulletin?")) {
            const latest = meetups[meetups.length - 1];
            const btn = document.getElementById('btn-clear-meetup');
            if(btn) { btn.innerText = "Clearing..."; btn.disabled = true; }
            
            await deleteQuoteFromSheet('MEETUP', latest[1], latest[2]);
            localStorage.removeItem('lastSeenMeetupId');
            renderMeetupBoard(); 
            if(btn) { btn.innerText = "Clear Active Bulletin"; btn.disabled = false; }
        }
    } else { alert("No active bulletin to clear!"); }
}
