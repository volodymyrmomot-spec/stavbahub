(function () {
    const headerHtml = `
        <div class="container header-content">
            <a href="index.html" class="logo">
                <img src="img/logo.jpg" alt="Stavbahub Logo" class="logo-img">
                Stavbahub
            </a>
            <nav>
                <ul class="nav-list" id="main-nav">
                    <li><a href="index.html" class="nav-link">Domov</a></li>
                    <li><a href="providers.html" class="nav-link">Majstri</a></li>
                    <li><a href="for-providers.html" class="nav-link">Cenník</a></li>
                    <!-- Dynamic nav items added by auth-state.js -->
                </ul>
            </nav>
        </div>
    `;

    // Try to find the header element
    const headerElement = document.querySelector('header.header');

    // If it exists, populate it
    if (headerElement) {
        headerElement.innerHTML = headerHtml;
    } else {
        // Optional: Log error or create header if missing (for robustness)
        console.warn('Header element .header not found');
    }
})();
