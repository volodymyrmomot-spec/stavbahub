// Universal Back Button
document.addEventListener('DOMContentLoaded', function () {
    // Check if back button already exists to prevent duplicates
    if (document.querySelector('.back-button-container')) return;

    // Create container
    const container = document.createElement('div');
    container.className = 'container back-button-container';

    // Create button
    const button = document.createElement('a');
    button.className = 'back-button';
    button.href = '#';
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Späť</span>
    `;

    // Add click handler
    button.addEventListener('click', function (e) {
        e.preventDefault();

        // Logic: If referrer is from same site, go back. Otherwise go to index.
        // Note: history.length is not always reliable for "previous page on site"

        const hasReferrer = document.referrer && document.referrer.indexOf(window.location.hostname) !== -1;

        if (hasReferrer) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });

    container.appendChild(button);

    // Insert after header
    const header = document.querySelector('header');
    if (header) {
        header.insertAdjacentElement('afterend', container);
    } else {
        // Fallback positions
        const main = document.querySelector('main') || document.querySelector('section');
        if (main) {
            main.insertAdjacentElement('beforebegin', container);
        } else {
            document.body.prepend(container);
        }
    }
});
