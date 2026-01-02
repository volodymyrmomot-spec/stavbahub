// Chat Conversation Page Logic
document.addEventListener('DOMContentLoaded', function () {
    const chatManager = new ChatManager();
    chatManager.init();

    // Get chat ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('id');

    if (!chatId) {
        alert('Neplatný chat.');
        window.location.href = 'chats.html';
        return;
    }

    // Get current user info
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');

    let currentUserId, currentUserType, currentUserName;

    if (loggedInCustomerId) {
        currentUserId = loggedInCustomerId;
        currentUserType = 'customer';
        const customer = JSON.parse(localStorage.getItem('loggedInCustomer') || '{}');
        currentUserName = customer.name || 'Zákazník';
    } else if (loggedInProviderId) {
        currentUserId = loggedInProviderId;
        currentUserType = 'provider';
        const provider = chatManager.getProviderById(loggedInProviderId);
        currentUserName = provider ? provider.name : 'Poskytovateľ';
    } else {
        alert('Musíte byť prihlásený.');
        window.location.href = 'login.html';
        return;
    }

    // Validate access to this chat
    if (!chatManager.validateAccess(chatId, currentUserId, currentUserType)) {
        alert('Nemáte prístup k tomuto chatu.');
        window.location.href = 'chats.html';
        return;
    }

    // Get chat details
    const chat = chatManager.getChatById(chatId);
    if (!chat) {
        alert('Chat sa nenašiel.');
        window.location.href = 'chats.html';
        return;
    }

    // Set chat partner name
    const partnerName = currentUserType === 'customer' ? chat.provider_name : chat.customer_name;
    document.getElementById('chat-partner-name').textContent = partnerName;

    // Load messages
    loadMessages();

    // Mark messages as read
    chatManager.markAsRead(chatId, currentUserId, currentUserType);

    // Handle message form submission
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');

    messageForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const content = messageInput.value.trim();
        if (!content) return;

        // Send message
        const result = chatManager.sendMessage(chatId, currentUserId, currentUserType, currentUserName, content);

        if (result.success) {
            // Clear input
            messageInput.value = '';

            // Add message to UI
            appendMessage(result.message);

            // Scroll to bottom
            scrollToBottom();
        } else {
            alert(result.error || 'Chyba pri odosielaní správy.');
        }
    });

    // Load and display messages
    function loadMessages() {
        const messages = chatManager.getMessages(chatId);
        const messagesList = document.getElementById('messages-list');

        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="empty-state"><p>Zatiaľ žiadne správy. Začnite konverzáciu!</p></div>';
            return;
        }

        messagesList.innerHTML = '';
        messages.forEach(msg => appendMessage(msg));
        scrollToBottom();
    }

    // Append a single message to the UI
    function appendMessage(message) {
        const messagesList = document.getElementById('messages-list');

        // Remove empty state if exists
        const emptyState = messagesList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const isSent = message.sender_type === currentUserType;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = message.message_id;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = message.content;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = chatManager.formatMessageTime(message.timestamp);

        // Add read indicator for sent messages
        if (isSent && message.is_read) {
            const readSpan = document.createElement('span');
            readSpan.className = 'read-indicator';
            readSpan.textContent = '✓';
            timeDiv.appendChild(readSpan);
        }

        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timeDiv);
        messagesList.appendChild(messageDiv);
    }

    // Scroll to bottom of messages
    function scrollToBottom() {
        const messagesList = document.getElementById('messages-list');
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    // Poll for new messages every 3 seconds
    let lastMessageId = null;

    function updateLastMessageId() {
        const messages = chatManager.getMessages(chatId);
        if (messages.length > 0) {
            lastMessageId = messages[messages.length - 1].message_id;
        }
    }

    updateLastMessageId();

    setInterval(function () {
        const newMessages = chatManager.getNewMessages(chatId, lastMessageId);

        if (newMessages.length > 0) {
            newMessages.forEach(msg => {
                // Only append if from other user (avoid duplicates from own messages)
                if (msg.sender_type !== currentUserType) {
                    appendMessage(msg);
                }
            });

            // Update last message ID
            updateLastMessageId();

            // Mark as read
            chatManager.markAsRead(chatId, currentUserId, currentUserType);

            // Scroll to bottom
            scrollToBottom();
        }
    }, 3000);

    // Focus input on load
    messageInput.focus();
});
