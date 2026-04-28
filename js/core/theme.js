
export function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark); 
    document.body.classList.toggle('light-mode', !isDark);
    
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { 
            btnLight.classList.remove('active'); 
            btnDark.classList.add('active'); 
        } else { 
            btnLight.classList.add('active'); 
            btnDark.classList.remove('active'); 
        }
    }
    updateMetaThemeColor(document.querySelector('.tab-content.active')?.id || 'home', isDark);
}

export function setThemeMode(isDark) { 
    applyTheme(isDark); 
    localStorage.setItem('HolidayPlanner_Theme', isDark); 
}

export function updateMetaThemeColor(pageId, isDark = document.body.classList.contains('dark-mode')) {
    let metaColor = isDark ? '#0b0e14' : '#f2f2f7';
    if (pageId === 'la') metaColor = '#ffcc00';
    else if (pageId === 'utah') metaColor = '#ff3b30';
    else if (pageId === 'vegas') metaColor = '#af52de';
    else if (pageId === 'flights') metaColor = '#0284c7';
    else if (pageId === 'splash') metaColor = isDark ? '#000000' : '#f2f2f7';
    
    const meta = document.getElementById('theme-meta'); 
    if (meta) meta.content = metaColor;
}
