function showPage(event, pageId) {
    // 1. Hide all the page sections
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
    });

    // 2. Remove the "active" styling from all buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the selected page section
    document.getElementById(pageId).style.display = 'block';

    // 4. Highlight the button that was just clicked
    event.currentTarget.classList.add('active');
}
