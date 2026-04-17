import { escapeHTML } from '../store.js?v=7.0.0';
import { triggerConfetti } from '../ui.js?v=7.0.0';

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'bill';
    const wheel = document.getElementById('roulette-wheel');
    if(!wheel) return;
    
    let names = mode === 'driving' ? ["Graeme", "Dave"] : ["Graeme", "Dawn", "Grace", "Dave", "Sarah", "Bexs", "Split it"];
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
    
    let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
    let currentTallies = tallies[mode] || {};
    
    let html = '';
    for (const [name, count] of Object.entries(currentTallies)) {
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
    const randomStop = Math.floor(Math.random() * 360);
    const totalRotation = currentRot + extraSpins + randomStop;
    
    wheel.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.1, 1)';
    wheel.style.transform = `rotate(${totalRotation}deg)`;
    wheel.dataset.currentRotation = totalRotation;
    
    const pointerAngle = (360 - (totalRotation % 360)) % 360;
    const sliceDeg = 360 / names.length;
    const winningIndex = Math.floor(pointerAngle / sliceDeg);
    const winner = names[winningIndex];
    
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
        
        let tallies = JSON.parse(localStorage.getItem('rouletteTallies') || '{"bill":{},"driving":{}}');
        if (!tallies[mode]) tallies[mode] = {};
        tallies[mode][winner] = (tallies[mode][winner] || 0) + 1;
        localStorage.setItem('rouletteTallies', JSON.stringify(tallies));
        renderScoreboard();
        
        triggerConfetti();
    }, 4500);
}
