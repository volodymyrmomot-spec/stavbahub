// Chat Page Logic
document.addEventListener('DOMContentLoaded', function () {
    // Get provider ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('providerId');

    if (!providerId) {
        alert('Chyba: ID poskytovateľa nebolo nájdené.');
        window.location.href = 'providers.html';
        return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Musíte byť prihlásený, aby ste mohli chatovať. Prosím, prihláste sa.');
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error('Failed to parse user data:', e);
        alert('Chyba pri načítaní údajov používateľa. Prosím, prihláste sa znova.');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is a customer
    if (user.role !== 'customer') {
        alert('Len zákazníci môžu chatovať s poskytovateľmi.');
        window.location.href = 'index.html';
        return;
    }

    // Initialize chat
    initChat(providerId, user, token);
});

async function initChat(providerId, user, token) {
    // Load provider info
    await loadProviderInfo(providerId);

    // Load message thread
    await loadMessages(providerId, token);

    // Setup form handler
    setupMessageForm(providerId, user, token);

    // Auto-scroll to bottom
    scrollToBottom();
}

async function loadProviderInfo(providerId) {
    try {
        const response = await fetch(`/api/providers/${providerId}`);

        if (!response.ok) {
            throw new Error('Provider not found');
        }

        const provider = await response.json();
        const providerNameEl = document.getElementById('provider-name');

        if (providerNameEl) {
            providerNameEl.textContent = provider.name || 'Poskytovateľ';
        }
    } catch (error) {
        console.error('Error loading provider:', error);
        const providerNameEl = document.getElementById('provider-name');
        if (providerNameEl) {
            providerNameEl.textContent = 'Poskytovateľ';
        }
    }
}

async function loadMessages(providerId, token) {
    try {
        const response = await fetch(`/api/messages/thread?providerId=${providerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load messages');
        }

        const data = await response.json();
        displayMessages(data.messages || []);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages');
    const emptyState = document.getElementById('empty-state');

    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    // Hide empty state if there are messages
    if (messages.length > 0 && emptyState) {
        emptyState.style.display = 'none';
    }

    // Clear existing messages (except empty state)
    const existingMessages = messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Render messages
    messages.forEach(message => {
        renderMessage(message);
    });

    scrollToBottom();
}

function renderMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');

    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-sent'; // All messages from customer are "sent"

    const textDiv = document.createElement('div');
    textDiv.textContent = message.text;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(message.createdAt);

    messageDiv.appendChild(textDiv);
    messageDiv.appendChild(timeDiv);

    messagesContainer.appendChild(messageDiv);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `Pred ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Pred ${diffHours} h`;

    return date.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setupMessageForm(providerId, user, token) {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');

    if (!form || !input) {
        console.error('Form or input not found');
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const text = input.value.trim();

        if (!text) {
            return;
        }

        // Disable input while sending
        input.disabled = true;

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    providerId: providerId,
                    text: text
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Nepodarilo sa odoslať správu.');
            }

            // Hide empty state
            const emptyState = document.getElementById('empty-state');
            if (emptyState) {
                emptyState.style.display = 'none';
            }

            // Add message to UI
            renderMessage(data.message);

            // Clear input
            input.value = '';

            // Scroll to bottom
            scrollToBottom();

        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.message || 'Chyba pri odosielaní správy.');
        } finally {
            input.disabled = false;
            input.focus();
        }
    });

    // Auto-resize textarea
    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
