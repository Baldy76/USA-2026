// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); 

// ==========================================
// 1. THEME LOGIC (Dark/Light Mode)
// ==========================================
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    
    const meta = document.getElementById('theme-meta'); 
    if(meta) {
        meta.content = isDark ? "#000000" : "#f2f2f7";
    }
    
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
}

window.setThemeMode = (isDark) => { 
    applyTheme(isDark); 
    localStorage.setItem('HolidayPlanner_Theme', isDark); 
};

// ==========================================
// 2. NAVIGATION & UI LOGIC
// ==========================================
function showPage(event, pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(pageId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// NEW: Function to toggle between Today and Tomorrow views
function switchDayView(day) {
    const todayView = document.getElementById('today-view');
    const tomorrowView = document.getElementById('tomorrow-view');
    const btnToday = document.getElementById('btn-show-today');
    const btnTomorrow = document.getElementById('btn-show-tomorrow');

    if (day === 'today') {
        todayView.style.display = 'block';
        tomorrowView.style.display = 'none';
        btnToday.style.backgroundColor = 'var(--accent)';
        btnToday.style.color = 'white';
        btnTomorrow.style.backgroundColor = 'var(--ios-grey)';
        btnTomorrow.style.color = 'var(--text)';
    } else {
        todayView.style.display = 'none';
        tomorrowView.style.display = 'block';
        btnTomorrow.style.backgroundColor = 'var(--accent)';
        btnTomorrow.style.color = 'white';
        btnToday.style.backgroundColor = 'var(--ios-grey)';
        btnToday.style.color = 'var(--text)';
    }
}

// ==========================================
// 3. FETCH AND FILTER DATA
// ==========================================
async function loadItinerary() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        
        const rows = data.split('\n').slice(1); 
        itineraryData = rows.filter(row => row.trim() !== ''); 
        
        itineraryData.forEach(row => {
            const columns = row.split(',');
            if(columns.length >= 5) {
                const who = columns[4].trim();
                if(who.toLowerCase() !== 'everyone') {
                    sheetFamilies.add(who);
                }
            }
        });

        populateDropdown();
        renderItinerary();
        
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('la-itinerary').innerHTML = "Failed to load itinerary.";
    }
}

function populateDropdown() {
    const select = document.getElementById('family-selector');
    select.innerHTML = '<option value="All">Show All Activities</option>';
    
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);

    allFamilies.forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = family;
        select.appendChild(option);
    });

    const savedFamily = localStorage.getItem('savedFamilyFilter');
    if (savedFamily) {
        select.value = savedFamily;
    }
}

function addCustomFamily() {
    const input = document.getElementById('new-family-name');
    const newName = input.value.trim();
    
    if (newName) {
        let customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
        if (!customFamilies.includes(newName)) {
            customFamilies.push(newName);
            localStorage.setItem('customFamilies', JSON.stringify(customFamilies));
            populateDropdown();
            document.getElementById('family-selector').value = newName;
            updateFamilyFilter();
        }
        input.value = ''; 
    }
}

function renderItinerary() {
    const selectedFamily = document.getElementById('family-selector').value;
    
    let htmlLA = '<ul style="list-style-type: none; padding: 0;">';
    let htmlUtah = '<ul style="list-style-type: none; padding: 0;">';
    let htmlVegas = '<ul style="list-style-type: none; padding: 0;">';
    let htmlToday = '<ul style="list-style-type: none; padding: 0;">';
    let htmlTomorrow = '<ul style="list-style-type: none; padding: 0;">';
    
    let todayCount = 0;
    let tomorrowCount = 0;
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Calculate tomorrow's date
    
    // Helper function to check if a spreadsheet date matches a target date
    function isSameDay(dateStr, targetDate) {
        let d = new Date(dateStr);
        if (isNaN(d)) {
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // Fallback for DD/MM/YYYY
            }
        }
        if (!isNaN(d)) {
            return d.toDateString() === targetDate.toDateString();
        }
        return false;
    }
    
    itineraryData.forEach(row => {
        const columns = row.split(','); 
        
        if(columns.length >= 5) {
            const date = columns[0].trim();
            const location = columns[1].trim();
            const activity = columns[2].trim();
            const time = columns[3].trim();
            const who = columns[4].trim(); 
            
            if (selectedFamily === 'All' || who.toLowerCase() === selectedFamily.toLowerCase() || who.toLowerCase() === 'everyone') {
                
                // FIXED: Official Google Maps Directions API URL structure
                const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
                
                const cardHtml = `
                    <li style="background: var(--card); margin-bottom: 15px; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: left; color: var(--text); transition: background-color 0.3s ease, color 0.3s ease;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--ios-grey); padding-bottom: 8px; margin-bottom: 8px;">
                            <strong>${date}</strong>
                            <span style="background: var(--ios-grey); padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; color: var(--text);">${who}</span>
                        </div>
                        <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">
                            🕒 ${time} <br>
                            📍 <a href="${mapLink}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: bold;">${location} (Get Directions)</a>
                        </div>
                        <div style="font-size: 16px;">${activity}</div>
                    </li>
                `;

                if (location.toLowerCase().includes('la') || location.toLowerCase().includes('los angeles')) {
                    htmlLA += cardHtml;
                } else if (location.toLowerCase().includes('utah')) {
                    htmlUtah += cardHtml;
                } else if (location.toLowerCase().includes('vegas')) {
                    htmlVegas += cardHtml;
                }
                
                // Sort into Today or Tomorrow
                if (isSameDay(date, today)) {
                    htmlToday += cardHtml;
                    todayCount++;
                } else if (isSameDay(date, tomorrow)) {
                    htmlTomorrow += cardHtml;
                    tomorrowCount++;
                }
            }
        }
    });
    
    htmlLA += '</ul>';
    htmlUtah += '</ul>';
    htmlVegas += '</ul>';
    
    // Check counts and apply fallback messages if empty
    if (todayCount === 0) {
        htmlToday = '<p style="color: var(--text); opacity: 0.7;">No activities scheduled for today. Time to relax by the pool!</p>';
    } else {
        htmlToday += '</ul>';
    }
    
    if (tomorrowCount === 0) {
        htmlTomorrow = '<p style="color: var(--text); opacity: 0.7;">No activities scheduled for tomorrow yet.</p>';
    } else {
        htmlTomorrow += '</ul>';
    }
    
    document.getElementById('la-itinerary').innerHTML = htmlLA;
    document.getElementById('utah-itinerary').innerHTML = htmlUtah;
    document.getElementById('vegas-itinerary').innerHTML = htmlVegas;
    document.getElementById('today-itinerary').innerHTML = htmlToday;
    document.getElementById('tomorrow-itinerary').innerHTML = htmlTomorrow;
}

function updateFamilyFilter() {
    const selectedFamily = document.getElementById('family-selector').value;
    localStorage.setItem('savedFamilyFilter', selectedFamily);
    renderItinerary();
}

// ==========================================
// 4. APP INITIALIZATION 
// ==========================================
window.onload = () => {
    const savedTheme = localStorage.getItem('HolidayPlanner_Theme') === 'true';
    applyTheme(savedTheme);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date-display').textContent = new Date().toLocaleDateString(undefined, options);

    loadItinerary();
};

// ==========================================
// 5. PWA & SERVICE WORKER LOGIC
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully.', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

function syncUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.update(); 
            }
        });
        
        alert("Syncing updates! The app will now reload.");
        window.location.reload(true); 
    } else {
        alert("Updating! The app will now reload.");
        window.location.reload(true);
    }
}
