// Chat Data Manager - Handles all chat and message operations
class ChatManager {
    constructor() {
        this.CHATS_KEY = 'chats';
        this.MESSAGES_KEY = 'messages';
    }

    // Initialize storage if needed
    init() {
        if (!localStorage.getItem(this.CHATS_KEY)) {
            localStorage.setItem(this.CHATS_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.MESSAGES_KEY)) {
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify([]));
        }
    }

    // Get all chats
    getAllChats() {
        return JSON.parse(localStorage.getItem(this.CHATS_KEY) || '[]');
    }

    // Get all messages
    getAllMessages() {
        return JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
    }

    // Save chats
    saveChats(chats) {
        localStorage.setItem(this.CHATS_KEY, JSON.stringify(chats));
    }

    // Save messages
    saveMessages(messages) {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
    }

    // Create or get existing chat
    createOrGetChat(customerId, customerName, customerEmail, providerId, providerName) {
        const chats = this.getAllChats();

        // Check if chat already exists
        const existingChat = chats.find(c =>
            c.customer_id === customerId && c.provider_id === providerId
        );

        if (existingChat) {
            return { success: true, chat: existingChat, isNew: false };
        }

        // Check provider plan restrictions (Basic = 1 chat max)
        const provider = this.getProviderById(providerId);
        if (provider && provider.plan === 'basic') {
            const providerChats = chats.filter(c => c.provider_id === providerId);
            if (providerChats.length >= 1) {
                return {
                    success: false,
                    error: 'Poskytovateľ má Basic plán a môže mať len 1 aktívny chat. Požiadajte ho o upgrade na Pro.',
                    upgrade_required: true
                };
            }
        }

        // Create new chat
        const newChat = {
            chat_id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            customer_id: customerId,
            customer_name: customerName,
            customer_email: customerEmail,
            provider_id: providerId,
            provider_name: providerName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message: '',
            last_message_time: new Date().toISOString(),
            unread_count_customer: 0,
            unread_count_provider: 0
        };

        chats.push(newChat);
        this.saveChats(chats);

        return { success: true, chat: newChat, isNew: true };
    }

    // Get chat by ID
    getChatById(chatId) {
        const chats = this.getAllChats();
        return chats.find(c => c.chat_id === chatId);
    }

    // Get chats for a user
    getChatsForUser(userId, userType) {
        const chats = this.getAllChats();

        if (userType === 'customer') {
            return chats.filter(c => c.customer_id === userId);
        } else if (userType === 'provider') {
            return chats.filter(c => c.provider_id === userId);
        }

        return [];
    }

    // Send message
    sendMessage(chatId, senderId, senderType, senderName, content) {
        // Validate access
        const chat = this.getChatById(chatId);
        if (!chat) {
            return { success: false, error: 'Chat not found' };
        }

        if (senderType === 'customer' && chat.customer_id !== senderId) {
            return { success: false, error: 'Access denied' };
        }

        if (senderType === 'provider' && chat.provider_id !== senderId) {
            return { success: false, error: 'Access denied' };
        }

        // Sanitize content
        const sanitizedContent = this.sanitizeMessage(content);
        if (!sanitizedContent) {
            return { success: false, error: 'Message cannot be empty' };
        }

        // Create message
        const newMessage = {
            message_id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            chat_id: chatId,
            sender_id: senderId,
            sender_type: senderType,
            sender_name: senderName,
            content: sanitizedContent,
            timestamp: new Date().toISOString(),
            is_read: false
        };

        // Save message
        const messages = this.getAllMessages();
        messages.push(newMessage);
        this.saveMessages(messages);

        // Update chat
        const chats = this.getAllChats();
        const chatIndex = chats.findIndex(c => c.chat_id === chatId);
        if (chatIndex !== -1) {
            chats[chatIndex].last_message = sanitizedContent;
            chats[chatIndex].last_message_time = newMessage.timestamp;
            chats[chatIndex].updated_at = newMessage.timestamp;

            // Increment unread count for recipient
            if (senderType === 'customer') {
                chats[chatIndex].unread_count_provider++;
            } else {
                chats[chatIndex].unread_count_customer++;
            }

            this.saveChats(chats);
        }

        return { success: true, message: newMessage };
    }

    // Get messages for a chat
    getMessages(chatId, limit = 50, offset = 0) {
        const messages = this.getAllMessages();
        const chatMessages = messages
            .filter(m => m.chat_id === chatId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return chatMessages.slice(offset, offset + limit);
    }

    // Get new messages after a specific message ID
    getNewMessages(chatId, afterMessageId) {
        const messages = this.getAllMessages();
        const chatMessages = messages
            .filter(m => m.chat_id === chatId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (!afterMessageId) {
            return chatMessages;
        }

        const afterIndex = chatMessages.findIndex(m => m.message_id === afterMessageId);
        if (afterIndex === -1) {
            return [];
        }

        return chatMessages.slice(afterIndex + 1);
    }

    // Mark messages as read
    markAsRead(chatId, userId, userType) {
        const messages = this.getAllMessages();
        let updated = false;

        messages.forEach(msg => {
            if (msg.chat_id === chatId && !msg.is_read) {
                // Mark as read if sent by the other user
                if (userType === 'customer' && msg.sender_type === 'provider') {
                    msg.is_read = true;
                    updated = true;
                } else if (userType === 'provider' && msg.sender_type === 'customer') {
                    msg.is_read = true;
                    updated = true;
                }
            }
        });

        if (updated) {
            this.saveMessages(messages);

            // Reset unread count
            const chats = this.getAllChats();
            const chatIndex = chats.findIndex(c => c.chat_id === chatId);
            if (chatIndex !== -1) {
                if (userType === 'customer') {
                    chats[chatIndex].unread_count_customer = 0;
                } else {
                    chats[chatIndex].unread_count_provider = 0;
                }
                this.saveChats(chats);
            }
        }

        return { success: true };
    }

    // Get total unread count for a user
    getUnreadCount(userId, userType) {
        const chats = this.getChatsForUser(userId, userType);
        let totalUnread = 0;

        chats.forEach(chat => {
            if (userType === 'customer') {
                totalUnread += chat.unread_count_customer || 0;
            } else {
                totalUnread += chat.unread_count_provider || 0;
            }
        });

        return totalUnread;
    }

    // Sanitize message content
    sanitizeMessage(content) {
        if (!content) return '';

        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim()
            .substring(0, 1000); // Max 1000 chars
    }

    // Helper: Get provider by ID
    getProviderById(providerId) {
        const customProviders = JSON.parse(localStorage.getItem('customProviders') || '[]');
        return customProviders.find(p => p.id === providerId);
    }

    // Helper: Get customer by ID
    getCustomerById(customerId) {
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        return customers.find(c => c.id === customerId);
    }

    // Validate chat access
    validateAccess(chatId, userId, userType) {
        const chat = this.getChatById(chatId);
        if (!chat) {
            return false;
        }

        if (userType === 'customer' && chat.customer_id !== userId) {
            return false;
        }

        if (userType === 'provider' && chat.provider_id !== userId) {
            return false;
        }

        return true;
    }

    // Format timestamp for display
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Práve teraz';
        } else if (diffMins < 60) {
            return `${diffMins} min`;
        } else if (diffHours < 24) {
            return `${diffHours} hod`;
        } else if (diffDays < 7) {
            return `${diffDays} dní`;
        } else {
            return date.toLocaleDateString('sk-SK');
        }
    }

    // Format time for message bubbles
    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
