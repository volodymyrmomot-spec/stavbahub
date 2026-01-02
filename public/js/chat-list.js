// Chat List Page Logic
document.addEventListener('DOMContentLoaded', function () {
    const chatManager = new ChatManager();
    chatManager.init();

    // Get current user info
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');

    let currentUserId, currentUserType;

    if (loggedInCustomerId) {
        currentUserId = loggedInCustomerId;
        currentUserType = 'customer';
    } else if (loggedInProviderId) {
        currentUserId = loggedInProviderId;
        currentUserType = 'provider';
    } else {
        alert('Musíte byť prihlásený.');
        window.location.href = 'login.html';
        return;
    }

    // Load chats
    loadChats();

    // Update badge
    updateHeaderBadge();

    // Poll for updates every 5 seconds
    setInterval(function () {
        loadChats();
        updateHeaderBadge();
    }, 5000);

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentUserType === 'customer') {
                localStorage.removeItem('loggedInCustomerId');
                localStorage.removeItem('loggedInCustomer');
            } else {
                localStorage.removeItem('loggedInProviderId');
            }
            window.location.href = 'index.html';
        });
    }

    function loadChats() {
        const chats = chatManager.getChatsForUser(currentUserId, currentUserType);
        const chatsList = document.getElementById('chats-list');

        if (chats.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>Zatiaľ nemáte žiadne správy.</p>
                    <p style="margin-top: 0.5rem;"><a href="providers.html" class="btn btn-primary">Nájsť majstra</a></p>
                </div>
            `;
            return;
        }

        // Sort by updated_at (most recent first)
        chats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        chatsList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = createChatItem(chat);
            chatsList.appendChild(chatItem);
        });
    }

    function createChatItem(chat) {
        const link = document.createElement('a');
        link.href = `chat.html?id=${chat.chat_id}`;
        link.className = 'chat-item';

        // Get partner info
        const partnerName = currentUserType === 'customer' ? chat.provider_name : chat.customer_name;
        const unreadCount = currentUserType === 'customer' ? chat.unread_count_customer : chat.unread_count_provider;

        // Format time
        const timeAgo = chatManager.formatTimestamp(chat.last_message_time);

        // Truncate last message
        const lastMessage = chat.last_message || 'Zatiaľ žiadne správy';
        const truncatedMessage = lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage;

        link.innerHTML = `
            <div class="chat-item-content">
                <div class="chat-item-header">
                    <div class="chat-partner-name">${escapeHtml(partnerName)}</div>
                    <div class="chat-time">${timeAgo}</div>
                </div>
                <div class="chat-last-message">${escapeHtml(truncatedMessage)}</div>
            </div>
            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
        `;

        return link;
    }

    function updateHeaderBadge() {
        const unreadCount = chatManager.getUnreadCount(currentUserId, currentUserType);
        const badge = document.getElementById('header-badge');

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
