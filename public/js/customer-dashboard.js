// Customer Dashboard Logic
document.addEventListener('DOMContentLoaded', function () {
    // Check if customer is logged in
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');

    if (!loggedInCustomerId) {
        alert('Musíte byť prihlásený ako zákazník.');
        window.location.href = 'login.html';
        return;
    }

    // Get customer data
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const customer = customers.find(c => c.id === loggedInCustomerId);

    if (!customer) {
        alert('Zákaznícky účet sa nenašiel.');
        localStorage.removeItem('loggedInCustomerId');
        localStorage.removeItem('loggedInCustomer');
        window.location.href = 'login.html';
        return;
    }

    // Display customer info
    document.getElementById('customer-name').textContent = customer.name || '-';
    document.getElementById('customer-email').textContent = customer.email || '-';
    document.getElementById('customer-phone').textContent = customer.phone || '-';

    // Display member since date
    if (customer.created_at) {
        const date = new Date(customer.created_at);
        document.getElementById('member-since').textContent = date.toLocaleDateString('sk-SK');
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
            localStorage.removeItem('loggedInCustomerId');
            localStorage.removeItem('loggedInCustomer');
            window.location.href = 'index.html';
        });
    }

    // Load messages preview
    function loadMessagesPreview() {
        const chatManager = new ChatManager();
        chatManager.init();

        const chats = chatManager.getChatsForUser(loggedInCustomerId, 'customer');
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

        const unreadCount = chatManager.getUnreadCount(loggedInCustomerId, 'customer');
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

    // Poll for new messages every 10 seconds
    setInterval(function () {
        loadMessagesPreview();
        updateChatBadge();
    }, 10000);
});
