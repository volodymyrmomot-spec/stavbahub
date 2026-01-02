// Header Profile Button - Dynamically show login/profile button based on user role
(function () {
    'use strict';

    // Check if user is logged in
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');

    // Find all nav lists
    const navLists = document.querySelectorAll('.nav-list');

    navLists.forEach(navList => {
        // Create profile button element
        const profileLi = document.createElement('li');
        profileLi.className = 'nav-profile-item';
        profileLi.style.cssText = 'margin-left: 1rem;';

        if (loggedInProviderId) {
            // Provider is logged in - show provider profile button
            profileLi.innerHTML = `
                <a href="dashboard.html" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">👤</span>
                    <span>Môj profil</span>
                </a>
            `;
        } else if (loggedInCustomerId) {
            // Customer is logged in - show customer profile button
            profileLi.innerHTML = `
                <a href="customer-dashboard.html" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">👤</span>
                    <span>Môj profil</span>
                </a>
            `;
        } else {
            // User is not logged in - show login button
            profileLi.innerHTML = `
                <a href="login.html" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">👤</span>
                    <span>Prihlásiť sa</span>
                </a>
            `;
        }

        // Insert before mobile menu button or at the end
        const searchItem = navList.querySelector('.nav-search-item');
        if (searchItem) {
            navList.insertBefore(profileLi, searchItem.nextSibling);
        } else {
            navList.appendChild(profileLi);
        }
    });
})();
