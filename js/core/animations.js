
export function triggerConfetti() {
    if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
    const colors = ['#007aff', '#ff9500', '#ff3b30', '#af52de', '#34c759', '#ffd60a'];
    for(let i=0; i<60; i++) {
        const conf = document.createElement('div'); conf.className = 'particle confetti';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + 'vw'; conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.animationDelay = (Math.random() * 0.5) + 's'; document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}

export function triggerEmojiRain(city) {
    if(navigator.vibrate) navigator.vibrate([30, 30]);
    const emojis = { 
        'la': ['🌴', '☀️', '🎬', '⭐', '🏄'], 
        'utah': ['⛰️', '🤠', '🏜️', '🥾', '🔥'], 
        'vegas': ['🎲', '🎰', '💸', '🃏', '🍸'],
        'flights': ['✈️', '🛫', '🛬', '☁️', '🌍']
    };
    const set = emojis[city] || ['✨'];
    for(let i=0; i<60; i++) { 
        const em = document.createElement('div'); em.className = 'particle emoji-drop';
        em.innerText = set[Math.floor(Math.random() * set.length)]; em.style.left = Math.random() * 100 + 'vw';
        em.style.animationDuration = (Math.random() * 2 + 2) + 's'; document.body.appendChild(em);
        setTimeout(() => em.remove(), 4000);
    }
}

export function triggerJackpotMode() {
    if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100, 50, 200]);
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.9)'; overlay.style.zIndex = '99999';
    overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.innerHTML = `<div style="font-size: 100px; animation: scalePulse 0.3s infinite alternate;">🎰</div><h1 style="color: #ffd60a; font-size: 50px; text-transform: uppercase; margin-top: 20px; font-weight: 900; text-shadow: 0 0 30px #ffd60a;">JACKPOT!</h1>`;
    document.body.appendChild(overlay);
    triggerConfetti(); 
    setTimeout(triggerConfetti, 500);
    setTimeout(triggerConfetti, 1000);
    setTimeout(() => {
        overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => overlay.remove(), 500);
    }, 3500);
}
