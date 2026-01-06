// Provider Plan Settings Script - With JWT Authentication
document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    // ===================================================================
    // JWT AUTHENTICATION - Check token first
    // ===================================================================
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Relácia vypršala. Prihláste sa znova.');
        window.location.href = 'login.html';
        return;
    }

    // ===================================================================
    // LOAD PROVIDER DATA FROM API
    // ===================================================================
    let stripeConfig = null;
    let provider = null;

    try {
        // Fetch Stripe Config (optional - don't fail if missing)
        try {
            const configRes = await fetch(`${API_BASE_URL}/api/config`);
            if (configRes.ok) {
                stripeConfig = await configRes.json();
            }
        } catch (e) {
            console.warn('Stripe config not available:', e);
        }

        // Fetch Provider with JWT
        const providerRes = await fetch(`${API_BASE_URL}/api/providers/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Handle 401/403 - token invalid/expired
        if (providerRes.status === 401 || providerRes.status === 403) {
            localStorage.clear();
            alert('Relácia vypršala. Prihláste sa znova.');
            window.location.href = 'login.html';
            return;
        }

        // Handle other errors
        if (!providerRes.ok) {
            const errorText = await providerRes.text();
            console.error('API Error:', providerRes.status, errorText);
            alert('Chyba pri načítaní údajov. Skúste to znova.');
            return;
        }

        provider = await providerRes.json();
        console.log('Provider data loaded:', provider);

    } catch (e) {
        console.error('Error loading data:', e);
        alert('Chyba pri načítaní údajov. Skontrolujte pripojenie.');
        return;
    }

    if (!provider) {
        alert('Chyba: Údaje o firme sa nenašli.');
        window.location.href = 'provider-dashboard.html';
        return;
    }

    // ===================================================================
    // DISPLAY CURRENT PLAN
    // ===================================================================
    displayCurrentPlan(provider.plan || 'basic');

    // ===================================================================
    // HANDLE PLAN SELECTION BUTTONS
    // ===================================================================
    const planButtons = document.querySelectorAll('.plan-select-btn');
    planButtons.forEach(button => {
        button.addEventListener('click', function () {
            const selectedPlan = this.getAttribute('data-plan');
            handlePlanChange(selectedPlan);
        });
    });

    // ===================================================================
    // HANDLE LOGOUT BUTTON
    // ===================================================================
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // ===================================================================
    // HANDLE MANAGE SUBSCRIPTION BUTTON (Pro/Pro+ only)
    // ===================================================================
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
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ providerId: provider._id || provider.id })
                });

                // Handle 401/403
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    alert('Relácia vypršala. Prihláste sa znova.');
                    window.location.href = 'login.html';
                    return;
                }

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
            if (currentPlanName) currentPlanName.textContent = 'Pro+';
            if (currentPlanPrice) currentPlanPrice.textContent = '39€/mes.';
            if (currentPlanBadge) {
                currentPlanBadge.textContent = 'PRO+';
                currentPlanBadge.className = 'provider-badge badge-pro-plus';
            }
        } else if (normalizedPlan === 'pro') {
            if (currentPlanName) currentPlanName.textContent = 'Pro';
            if (currentPlanPrice) currentPlanPrice.textContent = '19€/mes.';
            if (currentPlanBadge) {
                currentPlanBadge.textContent = 'PRO';
                currentPlanBadge.className = 'provider-badge badge-pro';
            }
        } else {
            if (currentPlanName) currentPlanName.textContent = 'Basic';
            if (currentPlanPrice) currentPlanPrice.textContent = 'Zadarmo';
            if (currentPlanBadge) {
                currentPlanBadge.textContent = 'BASIC';
                currentPlanBadge.className = 'provider-badge badge-basic';
            }
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
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ providerId: provider._id || provider.id })
                });

                // Handle 401/403
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    alert('Relácia vypršala. Prihláste sa znova.');
                    window.location.href = 'login.html';
                    return;
                }

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
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        priceId: priceId,
                        providerId: provider._id || provider.id
                    })
                });

                // Handle 401/403
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    alert('Relácia vypršala. Prihláste sa znova.');
                    window.location.href = 'login.html';
                    return;
                }

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
