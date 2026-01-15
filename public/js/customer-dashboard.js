// Customer Dashboard Logic - JWT Token Based
document.addEventListener('DOMContentLoaded', function () {
    // Check if customer is logged in via JWT token
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Musíte byť prihlásený ako zákazník.');
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error('Failed to parse user data:', e);
        alert('Chyba pri načítaní údajov používateľa.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }

    // Verify this is a customer account
    if (user.role !== 'customer') {
        alert('Táto stránka je len pre zákazníkov.');
        // Redirect to appropriate dashboard based on role
        if (user.role === 'provider') {
            window.location.href = 'provider-dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
        return;
    }

    // Display customer info
    document.getElementById('customer-name').textContent = user.name || '-';
    document.getElementById('customer-email').textContent = user.email || '-';

    // Phone might not be in the user object from JWT, try to get from legacy storage
    const legacyCustomer = JSON.parse(localStorage.getItem('loggedInCustomer') || '{}');
    document.getElementById('customer-phone').textContent = legacyCustomer.phone || user.phone || '-';

    // Display member since date (from createdAt timestamp if available)
    if (user.createdAt) {
        const date = new Date(user.createdAt);
        document.getElementById('member-since').textContent = date.toLocaleDateString('sk-SK');
    } else {
        document.getElementById('member-since').textContent = '-';
    }

    // Load recent messages preview
    loadMessagesPreview();

    // Update chat badge
    updateChatBadge();

    // Handle edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function () {
            // For now, just show alert - can implement edit form later
            alert('Funkcia úpravy profilu bude dostupná čoskoro.');
        });
    }

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            handleLogout();
        });
    }

    // Load messages preview
    function loadMessagesPreview() {
        const chatManager = new ChatManager();
        chatManager.init();

        // Use user.id for chat lookup (maintain backward compatibility with loggedInCustomerId)
        const customerId = user.id || localStorage.getItem('loggedInCustomerId');
        const chats = chatManager.getChatsForUser(customerId, 'customer');
        const messagesPreview = document.getElementById('messages-preview');

        if (chats.length === 0) {
            messagesPreview.innerHTML = `
                <p style="color: var(--text-gray); text-align: center; padding: 2rem;">
                    Zatiaľ nemáte žiadne konverzácie. <a href="providers.html" style="color: var(--primary-blue);">Nájdite majstra</a> a začnite komunikovať.
                </p>
            `;
            return;
        }

        // Sort by most recent
        chats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        // Show first 3 chats
        const recentChats = chats.slice(0, 3);

        messagesPreview.innerHTML = '';

        recentChats.forEach(chat => {
            const chatItem = document.createElement('a');
            chatItem.href = `chat.html?id=${chat.chat_id}`;
            chatItem.style.cssText = 'display: block; padding: 1rem; border-bottom: 1px solid var(--border-color); text-decoration: none; color: inherit; transition: background 0.2s;';
            chatItem.onmouseover = function () { this.style.background = '#f9fafb'; };
            chatItem.onmouseout = function () { this.style.background = 'transparent'; };

            const unreadBadge = chat.unread_count_customer > 0
                ? `<span style="background: var(--primary-blue); color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">${chat.unread_count_customer}</span>`
                : '';

            const timeAgo = chatManager.formatTimestamp(chat.last_message_time);
            const lastMessage = chat.last_message || 'Zatiaľ žiadne správy';
            const truncatedMessage = lastMessage.length > 60 ? lastMessage.substring(0, 60) + '...' : lastMessage;

            chatItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${chat.provider_name}${unreadBadge}</strong>
                    <span style="font-size: 0.875rem; color: var(--text-gray);">${timeAgo}</span>
                </div>
                <p style="margin: 0; color: var(--text-gray); font-size: 0.875rem;">${truncatedMessage}</p>
            `;

            messagesPreview.appendChild(chatItem);
        });
    }

    // Update chat badge in header
    function updateChatBadge() {
        const chatManager = new ChatManager();
        chatManager.init();

        const customerId = user.id || localStorage.getItem('loggedInCustomerId');
        const unreadCount = chatManager.getUnreadCount(customerId, 'customer');
        const badge = document.getElementById('chat-badge');

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Handle logout
    function handleLogout() {
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loggedInCustomerId');
        localStorage.removeItem('loggedInCustomer');
        localStorage.removeItem('loggedInProviderId');
        localStorage.removeItem('loggedInProvider');

        window.location.href = 'index.html';
    }

    // Poll for new messages every 10 seconds
    setInterval(function () {
        loadMessagesPreview();
        updateChatBadge();
    }, 10000);
});
