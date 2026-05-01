import { state, getVal, setVal } from '../store.js';
import { triggerConfetti } from '../ui.js'; 

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'drinks';
    const wheel = document.getElementById('roulette-wheel');
    if (!wheel) return;
    
    // Setup generic group options depending on mode
    let options = [];
    if (mode === 'drinks') options = ['Graeme', 'Dawn', 'Grace', 'David', 'Sarah', 'Bexs'];
    else if (mode === 'dinner') options = ['Leech Family', 'Murray Family'];
    else if (mode === 'front_seat') options = ['Graeme', 'Dawn', 'Grace', 'David', 'Sarah', 'Bexs'];
    
    wheel.innerHTML = '';
    const sliceAngle = 360 / options.length;
    
    options.forEach((opt, index) => {
        const slice = document.createElement('div');
        slice.className = 'roulette-slice';
        slice.style.transform = `rotate(${index * sliceAngle}deg)`;
        
        const text = document.createElement('span');
        text.className = 'slice-text';
        text.innerText = opt;
        
        slice.appendChild(text);
        wheel.appendChild(slice);
    });

    window.rouletteOptions = options;
    window.currentRotation = window.currentRotation || 0;
}

export async function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const resultDisplay = document.getElementById('roulette-result');
    if (!wheel || !window.rouletteOptions || window.isSpinning) return;

    window.isSpinning = true;
    if(navigator.vibrate) navigator.vibrate(50);
    
    resultDisplay.innerText = "Spinning...";
    resultDisplay.style.color = "var(--text)";

    const options = window.rouletteOptions;
    let winningIndex = Math.floor(Math.random() * options.length);

    // 🕵️ THE INSIDE JOB RIG 🕵️
    if (window.isRouletteRigged) {
        const myName = localStorage.getItem('appUser') || 'All';
        // Keeps rerolling if the outcome matches your set app name!
        while (options[winningIndex].toLowerCase().includes(myName.toLowerCase()) && options.length > 1) {
            winningIndex = Math.floor(Math.random() * options.length);
        }
    }

    const sliceAngle = 360 / options.length;
    const extraSpins = 5 * 360; 
    const finalAngle = extraSpins + (360 - (winningIndex * sliceAngle)) - (sliceAngle / 2);
    
    window.currentRotation += finalAngle;
    wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)';
    wheel.style.transform = `rotate(${window.currentRotation}deg)`;

    setTimeout(async () => {
        window.isSpinning = false;
        const winner = options[winningIndex];
        resultDisplay.innerText = `${winner} pays!`;
        resultDisplay.style.color = "var(--accent)";
        triggerConfetti();
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Save tally
        let tally = await getVal('roulette_tally') || {};
        tally[winner] = (tally[winner] || 0) + 1;
        await setVal('roulette_tally', tally);
        renderScoreboard();
    }, 4000);
}

export async function renderScoreboard() {
    const sb = document.getElementById('roulette-scoreboard');
    if (!sb) return;
    
    const tally = await getVal('roulette_tally') || {};
    if (Object.keys(tally).length === 0) {
        sb.innerHTML = '<div style="opacity: 0.6; text-align: center; width: 100%;">No victims yet!</div>';
        return;
    }

    sb.innerHTML = '';
    const sorted = Object.entries(tally).sort((a,b) => b[1] - a[1]);
    
    sorted.forEach(([name, count]) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '5px 0';
        row.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        
        row.innerHTML = `<strong>${name}</strong><span>${count} Losses</span>`;
        sb.appendChild(row);
    });
}

export async function resetRouletteScores() {
    if(confirm("Clear the loser board?")) {
        await setVal('roulette_tally', {});
        renderScoreboard();
    }
}
