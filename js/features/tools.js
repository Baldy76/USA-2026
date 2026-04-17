import { state } from '../store.js?v=7.0.0';

export let currentTipPercent = 18;

export function convertCurrency() { 
    const usdInput = document.getElementById('usd-input');
    const clearBtn = document.getElementById('clear-usd');
    const usd = parseFloat(usdInput?.value);
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    if (clearBtn) clearBtn.style.display = usdInput?.value ? 'flex' : 'none';
    if(document.getElementById('gbp-output')) {
        if(!isNaN(usd)) document.getElementById('gbp-output').innerText = `£${(usd / rate).toFixed(2)}`;
        else document.getElementById('gbp-output').innerText = `£0.00`;
    }
}

export function setTip(percent, btnElement) { 
    currentTipPercent = percent; 
    document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active')); 
    if(btnElement) btnElement.classList.add('active'); 
    calculateTip(); 
}

export function calculateTip() { 
    const b = parseFloat(document.getElementById('bill-total')?.value) || 0;
    const splitBtn = document.querySelector('.split-btn.active');
    const s = splitBtn ? parseInt(splitBtn.dataset.split) : 2;
    const rate = window.liveExchangeRate || state.liveExchangeRate || 1.25; 
    const t = b * (1 + (currentTipPercent / 100)), usd = t / s, gbp = usd / rate; 
    if(document.getElementById('tip-usd')) document.getElementById('tip-usd').innerText = `$${usd.toFixed(2)}`;
    if(document.getElementById('tip-gbp')) document.getElementById('tip-gbp').innerText = `£${gbp.toFixed(2)}`;
}
