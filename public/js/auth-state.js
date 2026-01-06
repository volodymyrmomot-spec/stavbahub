// Global Authentication State Manager
// This script should be included on EVERY page to maintain login state

(function () {
    'use strict';

    // Get current login state
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');

    // Determine user state
    let userState = {
        isLoggedIn: false,
        role: null,
        userId: null,
        userName: null,
        dashboardUrl: null
    };

    if (loggedInProviderId) {
        // Provider is logged in
        const providers = JSON.parse(localStorage.getItem('customProviders') || '[]');
        const provider = providers.find(p => p.id === loggedInProviderId);

        if (provider) {
            userState = {
                isLoggedIn: true,
                role: 'provider',
                userId: loggedInProviderId,
                userName: provider.name || 'Poskytovateľ',
                dashboardUrl: 'provider-dashboard.html' // Fixed: use provider-dashboard.html
            };
        } else {
            // Provider not found in local cache, but might be valid tokens. 
            // Do NOT clear session here. Just set generic state.
            userState = {
                isLoggedIn: true,
                role: 'provider',
                userId: loggedInProviderId,
                userName: 'Poskytovateľ',
                dashboardUrl: 'provider-dashboard.html'
            };
        }
    } else if (loggedInCustomerId) {
        // Customer is logged in
        const customer = JSON.parse(localStorage.getItem('loggedInCustomer') || '{}');

        // Verify ID match if object exists
        if (customer && customer.id === loggedInCustomerId) {
            userState = {
                isLoggedIn: true,
                role: 'customer',
                userId: loggedInCustomerId,
                userName: customer.name || 'Zákazník',
                dashboardUrl: 'customer-dashboard.html'
            };
        } else {
            // Customer not found locally but ID exists. Assume valid.
            userState = {
                isLoggedIn: true,
                role: 'customer',
                userId: loggedInCustomerId,
                userName: 'Zákazník',
                dashboardUrl: 'customer-dashboard.html'
            };
        }
    }

    // Update all navigation lists on the page
    function updateNavigation() {
        const navLists = document.querySelectorAll('.nav-list');

        navLists.forEach(navList => {
            // Remove any existing auth-related items
            const existingAuthItems = navList.querySelectorAll('.nav-auth-item, .nav-profile-item');
            existingAuthItems.forEach(item => item.remove());

            if (userState.isLoggedIn) {
                // User is logged in - show profile and logout

                // Add Messages link (for both customers and providers)
                const messagesLi = document.createElement('li');
                messagesLi.className = 'nav-auth-item';
                messagesLi.innerHTML = `
                    <a href="chats.html" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>💬 Správy</span>
                        <span id="nav-chat-badge" class="badge" style="display: none;"></span>
                    </a>
                `;
                navList.appendChild(messagesLi);

                // Add Profile link
                const profileLi = document.createElement('li');
                profileLi.className = 'nav-auth-item';
                profileLi.innerHTML = `
                    <a href="${userState.dashboardUrl}" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.25rem;">👤</span>
                        <span>Môj profil</span>
                    </a>
                `;
                navList.appendChild(profileLi);

                // Add Logout button
                const logoutLi = document.createElement('li');
                logoutLi.className = 'nav-auth-item';
                logoutLi.innerHTML = `
                    <a href="#" class="btn btn-outline logout-btn" style="white-space: nowrap;">
                        Odhlásiť sa
                    </a>
                `;
                navList.appendChild(logoutLi);

                // Add logout event listener
                const logoutBtn = logoutLi.querySelector('.logout-btn');
                logoutBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    handleLogout();
                });

            } else {
                // User is not logged in - show login and registration options

                const loginLi = document.createElement('li');
                loginLi.className = 'nav-auth-item';
                loginLi.innerHTML = `
                    <a href="login.html" class="btn btn-primary">
                        Prihlásenie
                    </a>
                `;
                navList.appendChild(loginLi);
            }
        });

        // Update chat badge if user is logged in
        if (userState.isLoggedIn) {
            updateChatBadge();
        }
    }

    // Handle logout
    function handleLogout() {
        // Clear all login data
        localStorage.removeItem('loggedInProviderId');
        localStorage.removeItem('loggedInCustomerId');
        localStorage.removeItem('loggedInCustomer');

        // Redirect to homepage
        window.location.href = 'index.html';
    }

    // Update chat badge
    function updateChatBadge() {
        // Only update if ChatManager is available
        if (typeof ChatManager === 'undefined') {
            return;
        }

        try {
            const chatManager = new ChatManager();
            chatManager.init();

            const unreadCount = chatManager.getUnreadCount(userState.userId, userState.role);
            const badge = document.getElementById('nav-chat-badge');

            if (badge && unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            }
        } catch (error) {
            // ChatManager not available on this page, ignore
            console.log('ChatManager not available');
        }
    }

    // Initialize navigation when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavigation);
    } else {
        updateNavigation();
    }

    // Make userState globally available for other scripts
    window.userState = userState;

})();
