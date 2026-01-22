document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read IDs from URL
    const urlParams = new URLSearchParams(window.location.search);
    const otherUserId = urlParams.get('userId');
    const providerId = urlParams.get('providerId'); // Legacy or fallback? 

    // We strictly need otherUserId for the backend controller.
    // If only providerId is present (legacy link), we might need to resolve it.
    // However, we updated provider-detail.js to pass userId.

    // 2. Read Token & User
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Musíte byť prihlásený.');
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);

    // Resolve target ID
    let targetUserId = otherUserId;
    if (!targetUserId && providerId) {
        // Fallback: try to fetch provider to get user ID
        try {
            const r = await fetch(`/api/providers/${providerId}`);
            if (r.ok) {
                const p = await r.json();
                // handle populated userId
                if (p.userId && typeof p.userId === 'object') {
                    targetUserId = p.userId._id || p.userId.id;
                } else {
                    targetUserId = p.userId;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (!targetUserId) {
        alert('Chyba: Nie je zadaný príjemca správy.');
        // window.location.href = 'messages.html';
        return;
    }

    // 3. Strict DOM Check
    const messagesEl = document.getElementById('messages-list'); // Note: ID changed in chat.html vs original chat.js
    // Let's verify chat.html ID. 
    // In chat.html content I saw: <div id="messages-list" ...>
    // But original chat.js used `messages`. 
    // I will use `messages-list` as per my inspection of chat.html.

    const form = document.getElementById('message-form'); // ID in chat.html: message-form
    const input = document.getElementById('message-input'); // ID in chat.html: message-input
    const partnerNameEl = document.getElementById('chat-partner-name');

    if (!messagesEl || !form || !input) {
        console.error('CRITICAL: DOM elements missing');
        return;
    }

    // 4. Load Header Info
    // We want to show the name of the other person.
    // We can try to fetch it if we know they are a provider.
    // Or just generic if customer.
    // If I am customer, target is provider -> fetch provider name.
    if (user.role === 'customer') {
        fetchProviderNameByUserId(targetUserId).then(name => {
            if (name && partnerNameEl) partnerNameEl.textContent = name;
        });
    } else {
        if (partnerNameEl) partnerNameEl.textContent = 'Zákazník';
    }

    // 5. Load thread
    loadMessages();

    // 6. Attach Submit Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text = input.value.trim();
        if (!text) return;

        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    toUserId: targetUserId,
                    text: text
                })
            });

            if (!response.ok) {
                const err = await response.json();
                alert('Chyba: ' + (err.error || 'Odoslanie zlyhalo'));
                return;
            }

            const data = await response.json();
            // Success - Append
            appendMessage(data.message, true); // true = sent by me
            input.value = '';
            scrollToBottom();

        } catch (err) {
            console.error('Network error:', err);
            alert('Chyba siete.');
        }
    });

    async function loadMessages() {
        try {
            const res = await fetch(`/api/messages/with/${targetUserId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                messagesEl.innerHTML = ''; // clear
                if (data.messages) {
                    data.messages.forEach(msg => {
                        const isMe = (msg.fromUser === user.id || msg.fromUser === user._id);
                        appendMessage(msg, isMe);
                    });
                    scrollToBottom();

                    // Mark as read
                    markAsRead();
                }
            }
        } catch (e) {
            console.error('Error loading thread', e);
        }
    }

    async function markAsRead() {
        try {
            await fetch('/api/messages/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ otherUserId: targetUserId })
            });
        } catch (e) { }
    }

    function appendMessage(msg, isMe) {
        // msg structure: { text, createdAt, ... }
        const div = document.createElement('div');
        div.className = isMe ? 'message sent' : 'message received';

        const timeStr = new Date(msg.createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
            <div class="message-bubble">
                ${escapeHtml(msg.text)}
                <div class="message-time">${timeStr}</div>
            </div>
        `;
        messagesEl.appendChild(div);
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function fetchProviderNameByUserId(userId) {
        try {
            // We iterate providers or search. 
            // In a real app we would have GET /api/users/:id but we don't.
            // Check /api/providers
            const r = await fetch('/api/providers');
            if (r.ok) {
                const all = await r.json();
                const p = all.find(item => item.userId === userId);
                return p ? p.name : 'Poskytovateľ';
            }
        } catch (e) { return 'Poskytovateľ'; }
        return 'Poskytovateľ';
    }
});
