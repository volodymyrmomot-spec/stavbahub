// Strict Chat Implementation
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read IDs from URL
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('providerId');
    const customerId = urlParams.get('customerId');

    // 2. Read Token & User
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Musíte byť prihlásený.');
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    const userRole = user.role || 'customer';

    // 3. Strict DOM Check
    const messagesEl = document.getElementById('messages');
    const form = document.getElementById('messageForm');
    const input = document.getElementById('messageInput');
    const providerNameEl = document.getElementById('provider-name');

    if (!messagesEl || !form || !input) {
        console.error('CRITICAL: DOM elements missing');
        return;
    }

    // 4. Role-based IDs verification
    // IF CUSTOMER: needs providerId
    // IF PROVIDER: needs customerId
    if (userRole === 'customer' && !providerId) {
        alert('Chýba ID poskytovateľa.');
        return;
    }
    if (userRole === 'provider' && !customerId) {
        alert('Chýba ID zákazníka.');
        return;
    }

    // 5. Load Header Info
    try {
        if (userRole === 'customer') {
            // Loading provider name
            const pRes = await fetch(`/api/providers/${providerId}`);
            if (pRes.ok) {
                const provider = await pRes.json();
                if (providerNameEl) providerNameEl.textContent = provider.name || 'Chat';
            }
        } else {
            // Loading customer name
            // We don't have a public GET /api/users/:id endpoint easily.
            // But we can just say "Zákazník" or let the fetch thread populate it if possible.
            // Or we can assume the user came from inbox which had the name. 
            if (providerNameEl) providerNameEl.textContent = 'Zákazník';
        }
    } catch (e) {
        console.error('Error loading header info', e);
    }

    // 6. Load thread
    loadThread(providerId, customerId, token, userRole);

    // 7. Attach Submit Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text = input.value.trim();
        if (!text) return;

        try {
            const body = { text };
            if (userRole === 'customer') {
                body.providerId = providerId;
            } else {
                body.customerId = customerId;
                // Provider ID is inferred backend side from token
            }

            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                alert('Chyba: ' + (err.error || 'Odoslanie zlyhalo'));
                return;
            }

            const data = await response.json();
            // Success - Append
            appendMessage(data.message.text, 'sent');
            input.value = '';
            scrollToBottom();

        } catch (err) {
            console.error('Network error:', err);
            alert('Chyba siete.');
        }
    });

    async function loadThread(pid, cid, tkn, role) {
        try {
            let url = `/api/messages/thread?`;
            if (role === 'customer') url += `providerId=${pid}`;
            else url += `customerId=${cid}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${tkn}` }
            });

            if (res.ok) {
                const data = await res.json();
                messagesEl.innerHTML = '';
                if (data.messages) {
                    data.messages.forEach(msg => {
                        // Determine if sent by ME
                        // msg.senderRole exists.
                        // If I am customer, and msg.senderRole is customer -> SENT
                        // If I am provider, and msg.senderRole is provider -> SENT

                        let isSent = false;
                        if (msg.senderRole) {
                            if (msg.senderRole === role) isSent = true;
                        } else {
                            // Fallback for old messages without senderRole (assumed customer -> provider)
                            if (role === 'customer') isSent = true; // Old messages were sent by customer
                            else isSent = false; // Old messages received by provider
                        }

                        appendMessage(msg.text, isSent ? 'sent' : 'received');
                    });
                    scrollToBottom();
                }
            }
        } catch (e) {
            console.error('Error loading thread', e);
        }
    }

    function appendMessage(text, type) {
        const div = document.createElement('div');
        div.classList.add('message');
        if (type === 'sent') div.classList.add('message-sent');
        else div.classList.add('message-received');

        div.textContent = text;
        messagesEl.appendChild(div);
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
});
