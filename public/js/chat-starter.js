// Global Chat Starter Function
// This function can be called from anywhere to start a chat with a provider

function startChat(providerId) {
    // Check if customer is logged in
    const loggedInCustomerId = localStorage.getItem('loggedInCustomerId');

    if (!loggedInCustomerId) {
        alert('Musíte byť prihlásený ako zákazník, aby ste mohli odoslať správu.');
        window.location.href = 'login.html';
        return;
    }

    // Get customer info
    const customer = JSON.parse(localStorage.getItem('loggedInCustomer') || '{}');
    const customerId = loggedInCustomerId;
    const customerName = customer.name || 'Zákazník';
    const customerEmail = customer.email || '';

    // Get provider info
    const chatManager = new ChatManager();
    chatManager.init();

    const provider = chatManager.getProviderById(providerId);

    if (!provider) {
        alert('Poskytovateľ sa nenašiel.');
        return;
    }

    const providerName = provider.name;

    // Create or get chat
    const result = chatManager.createOrGetChat(
        customerId,
        customerName,
        customerEmail,
        providerId,
        providerName
    );

    if (result.success) {
        // Redirect to chat
        window.location.href = `chat.html?id=${result.chat.chat_id}`;
    } else {
        // Show error (e.g., Basic plan limit)
        if (result.upgrade_required) {
            alert(result.error + '\n\nPoskytovateľ musí upgradovať svoj plán na Pro alebo Pro+.');
        } else {
            alert(result.error || 'Chyba pri vytváraní chatu.');
        }
    }
}

// Make function globally available
if (typeof window !== 'undefined') {
    window.startChat = startChat;
}
