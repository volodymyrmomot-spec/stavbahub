// Global Authentication State Manager
// This script should be included on EVERY page to maintain login state

(function () {
    'use strict';

    // Get current login state - prioritize JWT token
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // Legacy keys for backward compatibility
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

    // First, try JWT token authentication (new system)
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);

            userState = {
                isLoggedIn: true,
                role: user.role,
                userId: user.id,
                userName: user.name || (user.role === 'customer' ? 'Zákazník' : 'Poskytovateľ'),
                dashboardUrl: user.role === 'customer' ? 'customer-dashboard.html' : 'provider-dashboard.html'
            };
        } catch (e) {
            console.error('Failed to parse user from token:', e);
            // Fall back to legacy authentication
        }
    }

    // Fall back to legacy localStorage authentication if JWT not available
    if (!userState.isLoggedIn) {
        if (loggedInProviderId) {
            // Provider is logged in (legacy)
            const providers = JSON.parse(localStorage.getItem('customProviders') || '[]');
            const provider = providers.find(p => p.id === loggedInProviderId);

            if (provider) {
                userState = {
                    isLoggedIn: true,
                    role: 'provider',
                    userId: loggedInProviderId,
                    userName: provider.name || 'Poskytovateľ',
                    dashboardUrl: 'provider-dashboard.html'
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
            // Customer is logged in (legacy)
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
    }

    // Update all navigation lists on the page
    function updateNavigation() {
        const navLists = document.querySelectorAll('.nav-list');

        // Handle "Majstri" link replacement globally
        const majstriLinks = document.querySelectorAll('a[href="providers.html"], a[href="messages.html?replaced=true"]');

        majstriLinks.forEach(link => {
            if (userState.isLoggedIn && userState.role === 'provider') {
                // Change to Moje správy
                // Check if already changed to avoid loop/flicker if we verify by href
                // We mark it to track it
                link.innerHTML = 'Moje správy <span id="nav-chat-badge" class="badge" style="display:none; margin-left:8px;"></span>';
                link.href = 'messages.html'; // NOTE: This breaks the querySelector on next run if we don't track it. 
                // But we re-run querySelector or use a class?
                // Actually, if we change href to messages.html, the selector 'a[href="providers.html"]' won't find it next time.
                // That's fine, as long as we handle logout reset.
                // But wait, if we logout, how do we find it back?
                // We should add a marking class/attribute.
                link.setAttribute('data-original-href', 'providers.html');
                link.setAttribute('data-replaced', 'true');
                link.style.display = 'flex';
                link.style.alignItems = 'center';
            } else {
                // Reset if it was replaced (e.g. logout or customer login)
                if (link.getAttribute('data-replaced') === 'true' || link.href.includes('messages.html')) {
                    // We need to be careful not to target the actual Messages link if we had one?
                    // But we targeted 'a[href="providers.html"]' initially.
                    // On reset, we look for data-replaced.
                }
            }
        });

        // Better reset strategy: Select by data attribute if we added it, OR select by original href.
        const replacedLinks = document.querySelectorAll('a[data-replaced="true"]');
        replacedLinks.forEach(link => {
            if (!userState.isLoggedIn || userState.role !== 'provider') {
                link.textContent = 'Majstri';
                link.href = 'providers.html';
                link.removeAttribute('data-replaced');
                link.removeAttribute('style');
                // Remove badge if inside
                const badge = link.querySelector('#nav-chat-badge');
                if (badge) badge.remove();
            }
        });

        navLists.forEach(navList => {
            // Remove any existing auth-related items
            const existingAuthItems = navList.querySelectorAll('.nav-auth-item, .nav-profile-item');
            existingAuthItems.forEach(item => item.remove());

            if (userState.isLoggedIn) {
                // User is logged in - show profile and logout

                // Add Messages link (ONLY for customers, since Providers have the replaced link)
                if (userState.role === 'customer') {
                    const messagesLi = document.createElement('li');
                    messagesLi.className = 'nav-auth-item';
                    messagesLi.innerHTML = `
                        <a href="messages.html" class="nav-link" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span>💬 Správy</span>
                            <span id="nav-chat-badge" class="badge" style="display: none;"></span>
                        </a>
                    `;
                    navList.appendChild(messagesLi);
                }

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
        // Clear all login data (both JWT and legacy)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loggedInProviderId');
        localStorage.removeItem('loggedInProvider');
        localStorage.removeItem('loggedInCustomerId');
        localStorage.removeItem('loggedInCustomer');

        // Redirect to homepage
        window.location.href = 'index.html';
    }

    // Update chat badge
    async function updateChatBadge() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/messages/threads', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const threads = data.threads || [];

                // Sum unread counts
                const totalUnread = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

                const badge = document.getElementById('nav-chat-badge');
                if (badge) {
                    if (totalUnread > 0) {
                        badge.textContent = totalUnread;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
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
