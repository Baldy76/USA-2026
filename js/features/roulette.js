import { escapeHTML, state } from '../store.js';
import { triggerConfetti } from '../ui.js';
import { saveQuoteToSheet } from '../api.js';

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const wheel = document.getElementById('roulette-wheel');
    if(!wheel) return;
    
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Sarah", "Bexs", "Dave", "Split it"];
    wheel.dataset.names = JSON.stringify(names);
    
    let gradient = [];
    let html = '';
    const sliceDeg = 360 / names.length;
    
    names.forEach((name, i) => {
        let color = i % 2 === 0 ? '#d0021b' : '#1c1c1e'; 
        if (name === "Split it") color = '#34c759'; 
        
        const startDeg = i * sliceDeg;
        const endDeg = (i + 1) * sliceDeg;
        gradient.push(`${color} ${startDeg}deg ${endDeg}deg`);
        
        const textRotate = startDeg + (sliceDeg / 2);
        html += `<div class="roulette-label" style="transform: translateX(-50%) rotate(${textRotate}deg);"><span>${name}</span></div>`;
    });
    
    wheel.style.background = `conic-gradient(${gradient.join(', ')})`;
    wheel.innerHTML = html;
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(0deg)`;
    wheel.dataset.currentRotation = 0;
    
    const resText = document.getElementById('roulette-result-text');
    if(resText) { resText.innerText = "Tap to Spin!"; resText.style.color = "white"; }
    
    renderScoreboard();
}

export function renderScoreboard() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const board = document.getElementById('roulette-scoreboard');
    if (!board) return;
    
    let tallies = {};
    let lastReset = 0;
    const quotes = state.quotesData || [];
    
    // Find the timestamp of the last reset for this mode
    quotes.forEach(q => {
        if (q[0] === 'ROULETTE_RESET' && q[1] === mode) {
            const ts = parseInt(q[2]);
            if (ts > lastReset) lastReset = ts;
        }
    });
    
    // Calculate live scores from the cloud!
    quotes.forEach(q => {
        if (q[0] === 'ROULETTE' && q[1] === mode) {
            const parts = (q[2] || '').split('|');
            const winner = parts[0];
            const ts = parseInt(parts[1] || '0');
            if (ts >= lastReset && winner) {
                tallies[winner] = (tallies[winner] || 0) + 1;
            }
        }
    });
    
    let html = '';
    for (const [name, count] of Object.entries(tallies)) {
        if (count > 0) {
            html += `<div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px;">${escapeHTML(name)} <span style="background: var(--card); color: var(--accent); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px;">${count}</span></div>`;
        }
    }
    
    if (html === '') {
        html = `<div style="font-size: 11px; opacity: 0.6; font-weight: 700; width: 100%;">No spins yet. Let's play!</div>`;
    }
    board.innerHTML = html;
}

export function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const btn = document.getElementById('btn-spin-roulette');
    const resText = document.getElementById('roulette-result-text');
    if(!wheel || !btn || btn.disabled) return;
    
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    
    btn.disabled = true; btn.style.opacity = '0.5';
    if(resText) { resText.innerText = "Spinning..."; resText.style.color = "rgba(255,255,255,0.7)"; }
    
    let names = JSON.parse(wheel.dataset.names || '[]');
    let currentRot = parseFloat(wheel.dataset.currentRotation || 0);
    
    const extraSpins = 360 * 6; 
    const sliceDeg = 360 / names.length;

    // PRE-CALCULATE THE WINNER
    let randomStop = Math.floor(Math.random() * 360);
    let pointerAngle = (360 - ((currentRot + extraSpins + randomStop) % 360)) % 360;
    let winningIndex = Math.floor(pointerAngle / sliceDeg);
    let winner = names[winningIndex];

    // 🕵️ THE INSIDE JOB RIG 🕵️
    if (window.isRouletteRigged) {
        const myName = localStorage.getItem('appUser') || 'All';
        let failsafe = 0; // Prevents an infinite loop if everyone's name is somehow yours
        
        // Keep silently re-rolling until it lands on someone else!
        while (winner.toLowerCase().includes(myName.toLowerCase()) && names.length > 1 && failsafe < 100) {
            randomStop = Math.floor(Math.random() * 360);
            pointerAngle = (360 - ((currentRot + extraSpins + randomStop) % 360)) % 360;
            winningIndex = Math.floor(pointerAngle / sliceDeg);
            winner = names[winningIndex];
            failsafe++;
        }
    }
    
    // Apply the final calculated rotation
    const totalRotation = currentRot + extraSpins + randomStop;
    
    wheel.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;
    wheel.dataset.currentRotation = totalRotation;
    
    let ticks = 0;
    const tickInterval = setInterval(() => {
        if(navigator.vibrate) navigator.vibrate(10);
        ticks++;
        if(ticks > 25) clearInterval(tickInterval);
    }, 150);

    setTimeout(() => {
        clearInterval(tickInterval);
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
        btn.disabled = false; btn.style.opacity = '1';
        
        if(resText) {
            resText.innerText = `${winner} Wins!`;
            resText.style.color = "#ffd60a"; 
            resText.style.transform = 'scale(1.2)';
            setTimeout(() => resText.style.transform = 'scale(1)', 200);
        }
        
        // Save to Google Sheets silently!
        saveQuoteToSheet('ROULETTE', mode, `${winner}|${Date.now()}`, true);
        
        renderScoreboard();
        triggerConfetti();
    }, 4500);
}

export function resetRouletteScores() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    if(confirm("Clear scores for everyone?")) {
        // Send a reset timestamp to the cloud!
        saveQuoteToSheet('ROULETTE_RESET', mode, Date.now().toString(), true);
        renderScoreboard();
    }
}
