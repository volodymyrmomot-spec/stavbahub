// Dynamic Header Navigation - Shows/Hides based on login state
(function () {
    'use strict';

    function updateHeaderNavigation() {
        const nav = document.getElementById('main-nav');
        if (!nav) return;

        // Check if user is logged in
        const loggedInProviderId = localStorage.getItem('loggedInProviderId');

        // Remove existing dynamic nav items
        const existingDynamic = nav.querySelectorAll('.dynamic-nav-item');
        existingDynamic.forEach(item => item.remove());

        if (loggedInProviderId) {
            // User is logged in - show "Môj profil" and "Odhlásiť sa"
            const profileLi = document.createElement('li');
            profileLi.className = 'dynamic-nav-item';
            profileLi.innerHTML = '<a href="provider-dashboard.html" class="nav-link">Môj profil</a>';

            const logoutLi = document.createElement('li');
            logoutLi.className = 'dynamic-nav-item';
            logoutLi.innerHTML = '<a href="#" id="logout-btn" class="btn btn-outline">Odhlásiť sa</a>';

            nav.appendChild(profileLi);
            nav.appendChild(logoutLi);

            // Setup logout handler
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    logout();
                });
            }
        } else {
            // User is not logged in - show "Prihlásenie"
            const loginLi = document.createElement('li');
            loginLi.className = 'dynamic-nav-item';
            loginLi.innerHTML = '<a href="login.html" class="btn btn-primary">Prihlásenie</a>';

            nav.appendChild(loginLi);
        }
    }

    function logout() {
        // Clear session
        localStorage.removeItem('loggedInProviderId');

        // Redirect to home page
        window.location.href = 'index.html';
    }

    // Update navigation when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeaderNavigation);
    } else {
        updateHeaderNavigation();
    }
})();
