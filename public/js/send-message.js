// Send Message Page Logic
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
        alert('Musíte byť prihlásený, aby ste mohli poslať správu. Prosím, prihláste sa.');
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
        alert('Len zákazníci môžu posielať správy poskytovateľom.');
        window.location.href = 'index.html';
        return;
    }

    // Load provider info
    loadProviderInfo(providerId);

    // Handle form submission
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await sendMessage(providerId, user, token);
        });
    }
});

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

async function sendMessage(providerId, user, token) {
    const messageText = document.getElementById('message-text');
    const submitBtn = document.querySelector('button[type="submit"]');
    const feedback = document.getElementById('message-feedback');

    if (!messageText) {
        console.error('Message textarea not found');
        return;
    }

    const text = messageText.value.trim();

    if (!text) {
        showFeedback('Prosím, napíšte správu.', 'error');
        return;
    }

    // Disable submit button
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Odosielam...';
    }

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

        // Success
        showFeedback('Správa bola úspešne odoslaná!', 'success');

        if (messageText) {
            messageText.value = '';
        }

        // Redirect back after 2 seconds
        setTimeout(() => {
            window.history.back();
        }, 2000);

    } catch (error) {
        console.error('Error sending message:', error);
        showFeedback(error.message || 'Chyba pri odosielaní správy.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

function showFeedback(message, type) {
    const feedback = document.getElementById('message-feedback');

    if (!feedback) {
        console.error('Feedback element not found');
        return;
    }

    feedback.textContent = message;
    feedback.style.display = 'block';
    feedback.style.padding = '0.75rem';
    feedback.style.borderRadius = '6px';
    feedback.style.marginTop = '1rem';

    if (type === 'success') {
        feedback.style.background = '#d1fae5';
        feedback.style.color = '#065f46';
        feedback.style.border = '1px solid #10b981';
    } else {
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.border = '1px solid #ef4444';
    }
}
