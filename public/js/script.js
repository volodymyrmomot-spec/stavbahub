document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
    }

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
                if (navList) navList.classList.remove('active');
            } else {
                // If on another page, go to index.html
                window.location.href = 'index.html#' + targetId;
            }
        });
    });

    // Form Handling - Firm Registration
    const firmForm = document.getElementById('firm-register-form');
    if (firmForm) {
        firmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Ďakujeme za registráciu firmy. Čoskoro vás budeme kontaktovať.');
            firmForm.reset();
        });
    }

    // Form Handling - Customer Registration
    const customerForm = document.getElementById('customer-register-form');
    if (customerForm) {
        customerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Registrácia zákazníka prebehla úspešne. Prihláste sa, aby ste mohli pridávať hodnotenia.');
            customerForm.reset();
        });
    }

    // Login Simulation & Reviews
    // Change these variables to test different states
    const isLoggedIn = false; // Set to true to simulate logged in user
    const userType = "guest"; // "guest", "customer", "provider"

    const reviewFormContainer = document.getElementById('review-form-container');
    const loginWarning = document.getElementById('login-warning');
    const reviewForm = document.getElementById('review-form');

    if (reviewFormContainer && loginWarning) {
        if (isLoggedIn && userType === 'customer') {
            reviewFormContainer.style.display = 'block';
            loginWarning.style.display = 'none';
        } else {
            reviewFormContainer.style.display = 'none';
            loginWarning.style.display = 'block';
        }
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Ďakujeme za vaše hodnotenie.');
            reviewForm.reset();
        });
    }

    // Service Cards Button Toggle
    const toggleButtons = document.querySelectorAll('.toggle-subcategories-btn');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default action
            e.stopPropagation(); // Stop click from bubbling to card if card has listener

            const card = btn.closest('.service-card');
            const wrapper = card.querySelector('.service-subcategories-wrapper');

            if (wrapper.style.display === 'block') {
                wrapper.style.display = 'none';
                btn.textContent = 'Zobraziť podkategórie';
            } else {
                wrapper.style.display = 'block';
                btn.textContent = 'Skryť podkategórie';
            }
        });
    });

    // Providers Page - Subcategory Filter Text
    const subcategoryFilterText = document.getElementById('subcategory-filter-text');
    if (subcategoryFilterText) {
        const urlParams = new URLSearchParams(window.location.search);
        const subcategory = urlParams.get('subcategory');

        if (subcategory) {
            // Format the slug back to readable text (simple replacement of hyphens)
            const readableSubcategory = subcategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            subcategoryFilterText.textContent = `Filtrované podľa podkategórie: ${readableSubcategory}`;
        } else {
            subcategoryFilterText.textContent = 'Zobrazujú sa všetci majstri';
        }
    }

    // Provider Detail Page - Plan Logic
    const providerPlanBadge = document.getElementById('provider-plan-badge');
    const providerGallery = document.getElementById('provider-gallery');
    const providerReviews = document.getElementById('provider-reviews');
    const planSpecificText = document.getElementById('plan-specific-text');

    if (providerPlanBadge) { // Check if we are on the provider detail page
        const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan');

        if (plan) {
            providerPlanBadge.style.display = 'inline-block';

            // Reset visibility first
            if (providerGallery) providerGallery.style.display = 'block';
            if (providerReviews) providerReviews.style.display = 'block';
            if (planSpecificText) planSpecificText.style.display = 'none';

            if (plan === 'basic') {
                providerPlanBadge.textContent = 'Basic';
                providerPlanBadge.classList.add('badge-basic');

                if (providerGallery) providerGallery.style.display = 'none';

                // Hide public rating stars and reviews for Basic
                if (providerReviews) providerReviews.style.display = 'none';

                if (planSpecificText) {
                    planSpecificText.textContent = 'Tento profil má základný plán bez fotiek a verejných hodnotení.';
                    planSpecificText.style.display = 'block';
                }
            } else if (plan === 'pro') {
                providerPlanBadge.textContent = 'Pro';
                providerPlanBadge.classList.add('badge-pro');
                // Pro shows gallery (limit to 3 visually if needed, but current HTML has 3) and reviews
            } else if (plan === 'proplus') {
                providerPlanBadge.textContent = 'Pro+';
                providerPlanBadge.classList.add('badge-pro-plus');

                if (planSpecificText) {
                    planSpecificText.textContent = 'Top pozícia vo vyhľadávaní.';
                    planSpecificText.style.display = 'block';
                }
                // Pro+ shows gallery and reviews
            }
        }
    }

    // Search Filtering Logic
    const CURRENT_USER_TYPE = 'customer'; // 'customer' or 'provider'
    // To test provider view, change CURRENT_USER_ID to 'provider_1' and CURRENT_USER_TYPE to 'provider'

    // 1. Handle "Napísať majstrovi" Button
    const contactProviderBtn = document.getElementById('contact-provider-btn');
    if (contactProviderBtn) {
        contactProviderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const providerId = contactProviderBtn.getAttribute('data-provider-id');
            const providerName = contactProviderBtn.getAttribute('data-provider-name');

            // Check if conversation exists, if not create new
            const conversationId = getOrCreateConversation(CURRENT_USER_ID, providerId, providerName);

            // Redirect to chat page
            window.location.href = `chat.html?conversationId=${conversationId}`;
        });
    }

    // 2. Chat Page Logic
    const messagesList = document.getElementById('messages-list');
    const messageForm = document.getElementById('message-form');
    const chatPartnerName = document.getElementById('chat-partner-name');

    if (messagesList && messageForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversationId');

        if (conversationId) {
            loadChatMessages(conversationId);

            // Set partner name in header
            const conversation = getConversation(conversationId);
            if (conversation) {
                if (CURRENT_USER_TYPE === 'customer') {
                    chatPartnerName.textContent = conversation.providerName;
                } else {
                    chatPartnerName.textContent = conversation.customerName;
                }
            }

            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('message-input');
                const text = input.value.trim();

                if (text) {
                    sendMessage(conversationId, text);
                    input.value = '';
                    loadChatMessages(conversationId); // Reload to show new message
                }
            });
        }
    }

    // 3. Dashboard Logic (Customer & Provider)
    const conversationsList = document.getElementById('conversations-list');
    if (conversationsList) {
        loadConversationsList();
    }

    // --- Helper Functions ---

    function getConversations() {
        return JSON.parse(localStorage.getItem('conversations')) || [];
    }

    function saveConversations(conversations) {
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    function getConversation(id) {
        const conversations = getConversations();
        return conversations.find(c => c.id === id);
    }

    function getOrCreateConversation(customerId, providerId, providerName) {
        const conversations = getConversations();
        let conversation = conversations.find(c => c.customerId === customerId && c.providerId === providerId);

        if (!conversation) {
            conversation = {
                id: 'conv_' + Date.now(),
                customerId: customerId,
                customerName: CURRENT_USER_NAME,
                providerId: providerId,
                providerName: providerName,
                messages: [],
                lastUpdated: new Date().toISOString()
            };
            conversations.push(conversation);
            saveConversations(conversations);
        }
        return conversation.id;
    }

    function sendMessage(conversationId, text) {
        const conversations = getConversations();
        const conversationIndex = conversations.findIndex(c => c.id === conversationId);

        if (conversationIndex !== -1) {
            const newMessage = {
                sender: CURRENT_USER_TYPE, // 'customer' or 'provider'
                text: text,
                timestamp: new Date().toISOString()
            };

            conversations[conversationIndex].messages.push(newMessage);
            conversations[conversationIndex].lastUpdated = newMessage.timestamp;
            saveConversations(conversations);

            // Simulate Notification
            const recipient = CURRENT_USER_TYPE === 'customer' ? 'Provider' : 'Customer';
            simulateEmailNotification(recipient, conversationId);
        }
    }

    function loadChatMessages(conversationId) {
        const conversation = getConversation(conversationId);
        if (!conversation) return;

        messagesList.innerHTML = '';

        conversation.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');

            if (msg.sender === CURRENT_USER_TYPE) {
                messageDiv.classList.add('message-sent');
            } else {
                messageDiv.classList.add('message-received');
            }

            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            messageDiv.innerHTML = `
                <div class="message-content">${escapeHtml(msg.text)}</div>
                <span class="message-time">${time}</span>
            `;

            messagesList.appendChild(messageDiv);
        });

        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    function loadConversationsList() {
        const conversations = getConversations();
        // Filter based on current user (simulated)
        // In a real app, backend would filter this. 
        // Here we filter by ID if we were strictly enforcing it, but for demo we show relevant ones.

        const myConversations = conversations.filter(c => {
            if (CURRENT_USER_TYPE === 'customer') return c.customerId === CURRENT_USER_ID;
            if (CURRENT_USER_TYPE === 'provider') return c.providerId === CURRENT_USER_ID; // Need to simulate provider login to test this
            return false;
        });

        conversationsList.innerHTML = '';

        if (myConversations.length === 0) {
            conversationsList.innerHTML = '<p style="text-align: center; color: #64748b;">Nemáte žiadne správy.</p>';
            return;
        }

        // Sort by last updated
        myConversations.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

        myConversations.forEach(c => {
            const partnerName = CURRENT_USER_TYPE === 'customer' ? c.providerName : c.customerName;
            const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1].text : 'Začiatok konverzácie';
            const lastTime = new Date(c.lastUpdated).toLocaleDateString() + ' ' + new Date(c.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('a');
            item.href = `chat.html?conversationId=${c.id}`;
            item.classList.add('conversation-item');

            item.innerHTML = `
                <div class="conversation-info">
                    <h3>${escapeHtml(partnerName)}</h3>
                    <p class="last-message">${escapeHtml(lastMsg)}</p>
                </div>
                <div class="conversation-meta">
                    <span class="last-time">${lastTime}</span>
                    <span class="unread-badge">Otvoriť</span>
                </div>
            `;

            conversationsList.appendChild(item);
        });
    }

    function simulateEmailNotification(recipient, conversationId) {
        console.log(`[EMAIL NOTIFICATION] To: ${recipient}`);
        console.log(`Subject: New Message Received`);
        console.log(`Body: You have a new message. Click here to view: /chat.html?conversationId=${conversationId}`);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
