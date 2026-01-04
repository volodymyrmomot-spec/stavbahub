// Provider Plan Settings Script - Frontend Only
document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    // 1. Check Authentication
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');

    if (!loggedInProviderId) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load Config & Provider Data
    let stripeConfig = null;
    let provider = null;

    try {
        // Fetch Config
        const configRes = await fetch(`${API_BASE_URL}/api/config`);
        stripeConfig = await configRes.json();

        // Fetch Provider
        const providerRes = await fetch(`${API_BASE_URL}/api/provider/${loggedInProviderId}`);
        if (providerRes.ok) {
            provider = await providerRes.json();
        } else {
            console.error('Failed to fetch provider');
        }
    } catch (e) {
        console.error('Error loading data', e);
    }

    if (!provider) {
        // Fallback to localStorage if API fails (though API is preferred)
        try {
            const customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
            provider = customProviders.find(p => p.id === loggedInProviderId);
        } catch (e) { }
    }

    if (!provider) {
        alert('Chyba: Údaje o firme sa nenašli.');
        window.location.href = 'dashboard.html';
        return;
    }

    // 3. Display Current Plan
    displayCurrentPlan(provider.plan || 'basic');

    // 4. Handle Plan Selection Buttons
    const planButtons = document.querySelectorAll('.plan-select-btn');
    planButtons.forEach(button => {
        button.addEventListener('click', function () {
            const selectedPlan = this.getAttribute('data-plan');
            handlePlanChange(selectedPlan);
        });
    });

    // 5. Handle Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('loggedInProviderId');
            window.location.href = 'index.html';
        });
    }

    // 6. Handle Manage Subscription Button (Pro/Pro+ only)
    const manageSubscriptionSection = document.getElementById('manage-subscription-section');
    const manageSubscriptionBtn = document.getElementById('manage-subscription-btn');

    // Show manage subscription button only for Pro/Pro+ users
    const currentPlan = (provider.plan || 'basic').toLowerCase();
    if (currentPlan === 'pro' || currentPlan === 'pro_plus' || currentPlan === 'proplus' || currentPlan === 'pro+') {
        if (manageSubscriptionSection) {
            manageSubscriptionSection.style.display = 'block';
        }
    }

    if (manageSubscriptionBtn) {
        manageSubscriptionBtn.addEventListener('click', async function () {
            this.disabled = true;
            this.textContent = 'Načítavam...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/create-billing-portal-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ providerId: loggedInProviderId })
                });
                const data = await response.json();

                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert('Chyba: ' + (data.error || 'Nepodarilo sa vytvoriť reláciu.'));
                    this.disabled = false;
                    this.textContent = '💳 Spravovať predplatné cez Stripe';
                }

            } catch (error) {
                console.error('Error creating portal session:', error);
                alert('Nastala chyba. Prosím skúste to znova neskôr.');
                this.disabled = false;
                this.textContent = '💳 Spravovať predplatné cez Stripe';
            }
        });
    }

    /**
     * Display the current plan in the UI
     */
    function displayCurrentPlan(plan) {
        const currentPlanName = document.getElementById('current-plan-name');
        const currentPlanPrice = document.getElementById('current-plan-price');
        const currentPlanBadge = document.getElementById('current-plan-badge');

        // Normalize plan value
        const normalizedPlan = plan.toLowerCase();

        if (normalizedPlan === 'pro+' || normalizedPlan === 'proplus' || normalizedPlan === 'pro-plus' || normalizedPlan === 'pro_plus') {
            currentPlanName.textContent = 'Pro+';
            currentPlanPrice.textContent = '39€/mes.';
            currentPlanBadge.textContent = 'PRO+';
            currentPlanBadge.className = 'provider-badge badge-pro-plus';
        } else if (normalizedPlan === 'pro') {
            currentPlanName.textContent = 'Pro';
            currentPlanPrice.textContent = '19€/mes.';
            currentPlanBadge.textContent = 'PRO';
            currentPlanBadge.className = 'provider-badge badge-pro';
        } else {
            currentPlanName.textContent = 'Basic';
            currentPlanPrice.textContent = 'Zadarmo';
            currentPlanBadge.textContent = 'BASIC';
            currentPlanBadge.className = 'provider-badge badge-basic';
        }
    }

    /**
     * Handle Plan Change Logic
     */
    async function handlePlanChange(newPlan) {
        const currentPlan = (provider.plan || 'basic').toLowerCase();
        const normalizedNewPlan = newPlan.toLowerCase() === 'proplus' ? 'pro_plus' : newPlan.toLowerCase();

        // Check if already on this plan
        if (currentPlan === normalizedNewPlan) {
            showMessage('Už používate tento plán.', 'info');
            return;
        }

        // Basic Plan -> Direct API call (no Stripe)
        if (normalizedNewPlan === 'basic') {
            if (!confirm('Naozaj chcete prejsť na plán Basic? Stratíte výhody vyššieho plánu.')) return;

            try {
                const response = await fetch(`${API_BASE_URL}/api/set-plan-basic`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ providerId: loggedInProviderId })
                });

                if (response.ok) {
                    showMessage('Plán bol úspešne zmenený na Basic.', 'success');
                    // Refresh page to update UI
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showMessage('Chyba pri zmene plánu.', 'error');
                }
            } catch (e) {
                console.error(e);
                showMessage('Chyba pri komunikácii so serverom.', 'error');
            }
            return;
        }

        // Pro / Pro+ -> Stripe Checkout
        if (normalizedNewPlan === 'pro' || normalizedNewPlan === 'pro_plus') {
            if (!stripeConfig || !stripeConfig.prices) {
                showMessage('Chyba konfigurácie Stripe.', 'error');
                return;
            }

            const priceId = stripeConfig.prices[normalizedNewPlan];
            if (!priceId) {
                showMessage(`Chýba Price ID pre plán ${normalizedNewPlan}.`, 'error');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        priceId: priceId,
                        providerId: loggedInProviderId
                    })
                });

                const data = await response.json();

                if (data.url) {
                    window.location.href = data.url;
                } else {
                    showMessage('Chyba pri vytváraní platby: ' + (data.error || 'Neznáma chyba'), 'error');
                }
            } catch (e) {
                console.error(e);
                showMessage('Chyba pri komunikácii so serverom.', 'error');
            }
        }
    }

    /**
     * Get display label for plan
     */
    function getPlanLabel(plan) {
        const normalizedPlan = plan.toLowerCase();
        if (normalizedPlan === 'pro+' || normalizedPlan === 'proplus' || normalizedPlan === 'pro-plus' || normalizedPlan === 'pro_plus') {
            return 'Pro+';
        } else if (normalizedPlan === 'pro') {
            return 'Pro';
        } else {
            return 'Basic';
        }
    }

    /**
     * Show message to user
     */
    function showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.plan-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `plan-message alert alert-${type}`;
        messageDiv.style.marginBottom = '1rem';
        messageDiv.style.padding = '1rem';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.textAlign = 'center';
        messageDiv.textContent = message;

        // Insert after section title
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.insertAdjacentElement('afterend', messageDiv);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }
});
