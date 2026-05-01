import { state, getVal, setVal } from '../store.js';
import { triggerConfetti } from '../ui.js'; 

export function initWheel() {
    const mode = document.getElementById('roulette-mode')?.value || 'drinks';
    const container = document.getElementById('roulette-wheel');
    if (!container) return;
    
    // Setup generic group options depending on mode
    let options = [];
    if (mode === 'drinks') options = ['Graeme', 'Dawn', 'Grace', 'David', 'Sarah', 'Bexs'];
    else if (mode === 'dinner') options = ['Leech Family', 'Murray Family'];
    else if (mode === 'front_seat') options = ['Graeme', 'Dawn', 'Grace', 'David', 'Sarah', 'Bexs'];
    
    window.rouletteOptions = options;
    window.currentRotation = window.currentRotation || 0;

    // 1. Force the container to be a perfect circle with a nice border
    container.style.position = 'relative';
    container.style.width = '300px';
    container.style.height = '300px';
    container.style.margin = '20px auto';
    container.style.borderRadius = '50%';
    container.style.border = '5px solid #1c1c1e';
    container.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
    container.style.backgroundColor = '#fff';

    // 2. Create the Canvas to draw the wheel
    container.innerHTML = ''; 
    const canvas = document.createElement('canvas');
    canvas.id = 'roulette-canvas';
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '50%';
    canvas.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)'; // Smooth spinning easing
    canvas.style.transform = `rotate(${window.currentRotation}deg)`;
    container.appendChild(canvas);

    // 3. Draw the slices and text perfectly
    const ctx = canvas.getContext('2d');
    const cx = 150; const cy = 150; const radius = 150;
    const colors = ['#ff3b30', '#34c759', '#007aff', '#ff9500', '#af52de', '#ffcc00'];
    const sliceAngle = (2 * Math.PI) / options.length;

    for (let i = 0; i < options.length; i++) {
        // Draw Slice
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, i * sliceAngle, (i + 1) * sliceAngle);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * sliceAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px -apple-system, sans-serif";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.fillText(options[i], radius - 20, 6); // Position text near the edge
        ctx.restore();
    }

    // Draw center peg
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#1c1c1e';
    ctx.fill();

    // 4. Inject a red pointer arrow pointing to the right side (3 o'clock)
    let pointer = document.getElementById('roulette-pointer');
    if (!pointer) {
        pointer = document.createElement('div');
        pointer.id = 'roulette-pointer';
        pointer.style.position = 'absolute';
        pointer.style.top = '50%';
        pointer.style.right = '-15px'; // Stick out slightly
        pointer.style.transform = 'translateY(-50%)';
        pointer.style.width = '0';
        pointer.style.height = '0';
        pointer.style.borderTop = '15px solid transparent';
        pointer.style.borderBottom = '15px solid transparent';
        pointer.style.borderRight = '25px solid #ff3b30'; // Red arrow
        pointer.style.filter = 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.4))';
        pointer.style.zIndex = '10';
        container.appendChild(pointer);
    }
}

export async function spinRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    const resultDisplay = document.getElementById('roulette-result');
    if (!canvas || !window.rouletteOptions || window.isSpinning) return;

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

    // --- Flawless Spin Math ---
    const sliceAngleDeg = 360 / options.length;
    const centerAngle = (winningIndex * sliceAngleDeg) + (sliceAngleDeg / 2);
    
    // We want the wheel to physically stop so the winner's center is at 0 degrees (3 o'clock)
    const targetPhysicalAngle = 360 - centerAngle;
    const currentPhysicalAngle = window.currentRotation % 360;
    
    let angleToAdd = targetPhysicalAngle - currentPhysicalAngle;
    if (angleToAdd < 0) angleToAdd += 360; 
    angleToAdd += (6 * 360); // Give it 6 full satisfying extra spins!
    
    window.currentRotation += angleToAdd;
    canvas.style.transform = `rotate(${window.currentRotation}deg)`;

    setTimeout(async () => {
        window.isSpinning = false;
        const winner = options[winningIndex];
        resultDisplay.innerText = `${winner} pays!`;
        resultDisplay.style.color = "var(--accent)";
        
        try { triggerConfetti(); } catch(e) {} // Safely pop confetti
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Save tally
        let tally = await getVal('roulette_tally') || {};
        tally[winner] = (tally[winner] || 0) + 1;
        await setVal('roulette_tally', tally);
        renderScoreboard();
    }, 4000); // 4000ms matches the CSS transition time
}

export async function renderScoreboard() {
    const sb = document.getElementById('roulette-scoreboard');
    if (!sb) return;
    
    const tally = await getVal('roulette_tally') || {};
    if (Object.keys(tally).length === 0) {
        sb.innerHTML = '<div style="opacity: 0.6; text-align: center; width: 100%; padding: 20px;">No victims yet!</div>';
        return;
    }

    sb.innerHTML = '';
    const sorted = Object.entries(tally).sort((a,b) => b[1] - a[1]);
    
    sorted.forEach(([name, count]) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '10px 0';
        row.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
        row.style.fontSize = '16px';
        
        row.innerHTML = `<strong>${name}</strong><span style="color: var(--accent); font-weight: bold;">${count} Losses</span>`;
        sb.appendChild(row);
    });
}

export async function resetRouletteScores() {
    if(confirm("Clear the loser board?")) {
        await setVal('roulette_tally', {});
        renderScoreboard();
    }
}
