// Connected to your live Google Sheet!
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWEEJQf9mQweTGIWx78Nq4wa2v2WCUEcBrrnAGcs6VTK5d4xeog4BL-Q7FyXMh6Nj33o-ZG2r01vQ5/pub?gid=0&single=true&output=csv';

let itineraryData = []; 
let sheetFamilies = new Set(); // Stores unique families found in the Google Sheet

// 1. Navigation Logic
function showPage(event, pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(pageId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// 2. Fetch the Data from Google Sheets
async function loadItinerary() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        
        const rows = data.split('\n').slice(1); 
        itineraryData = rows.filter(row => row.trim() !== ''); 
        
        // Auto-detect families from the spreadsheet
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
        document.getElementById('la-itinerary').innerHTML = "Failed to load itinerary. Please check your connection.";
    }
}

// 3. Populate Dropdown with both Sheet data and Local Custom data
function populateDropdown() {
    const select = document.getElementById('family-selector');
    select.innerHTML = '<option value="All">Show All Activities</option>';
    
    // Get custom families saved on this device
    const customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
    
    // Combine Sheet families and Custom families, avoiding duplicates
    const allFamilies = new Set([...sheetFamilies, ...customFamilies]);

    allFamilies.forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = family;
        select.appendChild(option);
    });

    // Restore saved selection if it exists
    const savedFamily = localStorage.getItem('savedFamilyFilter');
    if (savedFamily) {
        select.value = savedFamily;
    }
}

// 4. Manual Custom Family Addition (Admin Page)
function addCustomFamily() {
    const input = document.getElementById('new-family-name');
    const newName = input.value.trim();
    
    if (newName) {
        let customFamilies = JSON.parse(localStorage.getItem('customFamilies')) || [];
        if (!customFamilies.includes(newName)) {
            customFamilies.push(newName);
            localStorage.setItem('customFamilies', JSON.stringify(customFamilies));
            populateDropdown();
            // Automatically select the newly added family
            document.getElementById('family-selector').value = newName;
            updateFamilyFilter();
        }
        input.value = ''; // Clear the input field
    }
}

// 5. Filter and Display the Data across all city pages
function renderItinerary() {
    const selectedFamily = document.getElementById('family-selector').value;
    
    // Reset HTML strings for each city
    let htmlLA = '<ul style="list-style-type: none; padding: 0;">';
    let htmlUtah = '<ul style="list-style-type: none; padding: 0;">';
    let htmlVegas = '<ul style="list-style-type: none; padding: 0;">';
    
    itineraryData.forEach(row => {
        const columns = row.split(','); 
        
        if(columns.length >= 5) {
            const date = columns[0].trim();
            const location = columns[1].trim();
            const activity = columns[2].trim();
            const time = columns[3].trim();
            const who = columns[4].trim(); 
            
            // THE MAGIC FILTER
            if (selectedFamily === 'All' || who.toLowerCase() === selectedFamily.toLowerCase() || who.toLowerCase() === 'everyone') {
                
                const cardHtml = `
                    <li style="background: #fff; margin-bottom: 15px; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: left;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                            <strong>${date}</strong>
                            <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; color: #475569;">${who}</span>
                        </div>
                        <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">🕒 ${time}</div>
                        <div style="font-size: 16px; color: #1e293b;">${activity}</div>
                    </li>
                `;

                // Sort the card into the correct city page based on the Location column
                if (location.toLowerCase().includes('la') || location.toLowerCase().includes('los angeles')) {
                    htmlLA += cardHtml;
                } else if (location.toLowerCase().includes('utah')) {
                    htmlUtah += cardHtml;
                } else if (location.toLowerCase().includes('vegas')) {
                    htmlVegas += cardHtml;
                }
            }
        }
    });
    
    htmlLA += '</ul>';
    htmlUtah += '</ul>';
    htmlVegas += '</ul>';
    
    document.getElementById('la-itinerary').innerHTML = htmlLA;
    document.getElementById('utah-itinerary').innerHTML = htmlUtah;
    document.getElementById('vegas-itinerary').innerHTML = htmlVegas;
}

// 6. Handle Dropdown Changes
function updateFamilyFilter() {
    const selectedFamily = document.getElementById('family-selector').value;
    localStorage.setItem('savedFamilyFilter', selectedFamily);
    renderItinerary();
}

// 7. Start the App
window.onload = () => {
    loadItinerary();
};

// ==========================================
// PWA & SERVICE WORKER LOGIC
// ==========================================

// Register the Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully.', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// Handle the "Sync Updates" button
function syncUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.update(); // Tells the browser to check sw.js for changes
            }
        });
        
        alert("Syncing updates! The app will now reload.");
        // Force a hard reload from the server to bypass the cache
        window.location.reload(true); 
    } else {
        alert("Updating! The app will now reload.");
        window.location.reload(true);
    }
}
