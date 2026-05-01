export function convertCurrency() {
    const usdInput = document.getElementById('usd-input');
    const gbpOutput = document.getElementById('gbp-output');
    
    if (!usdInput || !gbpOutput) return;
    
    const usdVal = parseFloat(usdInput.value);
    
    // Grab the live rate, or default to 0.79 if the app has literally never been online
    const rate = parseFloat(localStorage.getItem('usd_gbp_rate')) || 0.79; 
    
    if (isNaN(usdVal)) {
        gbpOutput.innerText = '£0.00';
    } else {
        const gbpVal = (usdVal * rate).toFixed(2);
        gbpOutput.innerText = `£${gbpVal}`;
    }
}

// Expose it so the API can trigger it automatically when it boots
window.convertCurrency = convertCurrency;

export function setTip(percent, btnElement) {
    document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    calculateTip();
}

export function calculateTip() {
    const billTotalEl = document.getElementById('bill-total');
    const tipUsdEl = document.getElementById('tip-usd');
    const tipGbpEl = document.getElementById('tip-gbp');
    
    const activeTipBtn = document.querySelector('.tip-btn.active');
    const activeSplitBtn = document.querySelector('.split-btn.active');
    
    if (!billTotalEl || !tipUsdEl || !tipGbpEl) return;

    const billTotal = parseFloat(billTotalEl.value) || 0;
    const tipPercent = activeTipBtn ? parseFloat(activeTipBtn.dataset.tip) / 100 : 0.20;
    const splitWays = activeSplitBtn ? parseFloat(activeSplitBtn.dataset.split) : 2;
    
    // Grab the live rate here too!
    const rate = parseFloat(localStorage.getItem('usd_gbp_rate')) || 0.79;

    const totalWithTip = billTotal * (1 + tipPercent);
    const perFamUsd = totalWithTip / splitWays;
    const perFamGbp = perFamUsd * rate;

    tipUsdEl.innerText = `$${perFamUsd.toFixed(2)}`;
    tipGbpEl.innerText = `£${perFamGbp.toFixed(2)}`;
}

window.calculateTip = calculateTip;
