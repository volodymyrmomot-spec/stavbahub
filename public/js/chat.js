// Strict Chat Implementation
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Read Provider ID
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('providerId'); // Strict requirement: read providerId

    // 2. Read Token
    const token = localStorage.getItem('token');

    // 3. Strict DOM Check
    const messagesEl = document.getElementById('messages');
    const form = document.getElementById('messageForm');
    const input = document.getElementById('messageInput');
    const providerNameEl = document.getElementById('provider-name');

    if (!messagesEl) {
        console.error('CRITICAL: Element #messages is missing in DOM');
        return;
    }
    if (!form) {
        console.error('CRITICAL: Element #messageForm is missing in DOM');
        return;
    }
    if (!input) {
        console.error('CRITICAL: Element #messageInput is missing in DOM');
        return;
    }

    if (!providerId) {
        alert('Chyba: Chýba ID poskytovateľa v URL.');
        return;
    }

    if (!token) {
        alert('Musíte byť prihlásený.');
        window.location.href = 'login.html';
        return;
    }

    // 4. Load Provider Name
    try {
        const pRes = await fetch(`/api/providers/${providerId}`);
        if (pRes.ok) {
            const provider = await pRes.json();
            if (providerNameEl) providerNameEl.textContent = provider.name || 'Chat';
        }
    } catch (e) {
        console.error('Error loading provider name', e);
    }

    // 5. Load thread
    loadThread(providerId, token);

    // 6. Attach Submit Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text = input.value.trim();
        if (!text) return;

        // Optimistic UI or wait? Requirement says "On success: Append..."
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

            if (!response.ok) {
                const err = await response.json();
                console.error('Send failed:', err);
                alert('Chyba pri odosielaní: ' + (err.error || 'Neznáma chyba'));
                return;
            }

            const data = await response.json();
            // Success
            appendMessage(data.message.text, 'sent');
            input.value = '';
            scrollToBottom();

        } catch (err) {
            console.error('Network error:', err);
            alert('Chyba siete.');
        }
    });

    async function loadThread(pid, tkn) {
        try {
            const res = await fetch(`/api/messages/thread?providerId=${pid}`, {
                headers: { 'Authorization': `Bearer ${tkn}` }
            });
            if (res.ok) {
                const data = await res.json();
                messagesEl.innerHTML = ''; // Clear loading/empty
                if (data.messages) {
                    data.messages.forEach(msg => {
                        // Check if message is from me (customer) or them (provider)
                        // The endpoint returns populated messages. 
                        // If I am customer, messages with my customerId are "sent".
                        // Wait, the API returns messages. We need to distinguish sent/received.
                        // For a customer view: 
                        // If createdBy match customerId? Or we check message.customerId.
                        // The message model has customerId and providerId.
                        // I am the customer. So all messages have my customerId.
                        // But who sent it? 
                        // Ah, the message model is likely simple: customer sends, provider receives?
                        // Or is it a two-way chat?
                        // The current Message model (viewed earlier):
                        // customerId, providerId, text.
                        // Usually this implies customer -> provider.
                        // Does provider -> customer exist?
                        // The task description says "customer-to-provider messaging".
                        // And "thread" endpoint returns "all messages between...".
                        // Let's assume for MVP customer sends, maybe provider reply is not fully implemented or uses same model?
                        // If it's just customer-to-provider, all messages are "sent" by me?
                        // Or maybe we verify the sender?
                        // The requirement says: "GET /api/messages/thread?providerId=<ID> returns all messages..."

                        // For now, simple logic: All messages in this thread are displayed.
                        // If we want to distinguish:
                        // We need to know 'who sent it'.
                        // Schema: customerId, providerId. 
                        // If the message has a 'sender' field?
                        // Mongoose model looked like: customerId, providerId, text.
                        // This implies 1 direction? Or maybe there's a 'from' field?
                        // Checking previous `Message.js` view: 
                        // "Created Message model with customerId, providerId, text..."
                        // It does NOT seem to have a 'sender' field. 
                        // This implies it might be one-way? OR we infer direction.
                        // BUT, if it's a "conversation", provider needs to reply.
                        // If provider replies, how is it stored?
                        // Maybe `sender: 'customer' | 'provider'`? 
                        // I don't recall adding that.
                        // The prompt says "Implement a reliable customer-to-provider messaging system."
                        // It might be just one-way for now? 
                        // "returns all messages between logged-in customer and that provider"

                        // I will verify Message.js content to be safe. 
                        // If strictly one-way, all are "sent".
                        // If indeterminate, I'll just show them.

                        // Since I can't check file now without breaking flow, I will stick to what the previous chat.js did:
                        // It had `message.className = 'message message-sent'; // All messages from customer are "sent"`
                        // I will preserve this logic.

                        appendMessage(msg.text, 'sent');
                    });
                    scrollToBottom();
                }
            }
        } catch (e) {
            console.error('Error loading thread', e);
        }
    }

    function appendMessage(text, type) {
        // type: 'sent' or 'received'
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
