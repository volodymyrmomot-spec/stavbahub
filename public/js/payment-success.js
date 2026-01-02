// Payment Success Handler
document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    const loadingState = document.getElementById('loading-state');
    const successState = document.getElementById('success-state');
    const errorState = document.getElementById('error-state');

    if (!sessionId) {
        // No session ID - check if there's pending registration data
        const pendingData = sessionStorage.getItem('pendingRegistration');

        if (pendingData) {
            // Complete registration from stored data
            await completeRegistrationFromStorage();
        } else {
            showError('Chýba ID platobnej relácie.');
        }
        return;
    }

    try {
        // Get pending registration data
        const pendingDataStr = sessionStorage.getItem('pendingRegistration');

        if (!pendingDataStr) {
            showError('Registračné údaje sa nenašli. Prosím zaregistrujte sa znova.');
            return;
        }

        const pendingData = JSON.parse(pendingDataStr);

        // Complete the registration
        await completeRegistration(pendingData, sessionId);

    } catch (error) {
        console.error('Payment verification error:', error);
        showError('Nastala chyba pri overovaní platby. Prosím kontaktujte podporu.');
    }
});

async function completeRegistration(registrationData, sessionId) {
    try {
        // Generate unique provider ID
        const providerId = 'provider_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Create provider account
        const newProvider = {
            id: providerId,
            name: registrationData.company_name,
            region: registrationData.region,
            city: registrationData.city,
            service_type: registrationData.service_category,
            category: registrationData.service_category,
            description: registrationData.service_description,
            plan: registrationData.plan,
            email: registrationData.email,
            phone: registrationData.phone,
            rating: 0,
            reviews_count: 0,
            is_verified: false,
            photos: [],
            workPhotos: [],
            reviews: [],
            views: 0,
            contacts: 0,
            subscription_status: 'active', // Mark as active after successful payment
            stripe_session_id: sessionId,
            payment_completed_at: new Date().toISOString(),
            profilePhotoData: registrationData.profilePhotoData || null
        };

        // Save to customProviders
        let customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
        customProviders.push(newProvider);
        localStorage.setItem('customProviders', JSON.stringify(customProviders));

        // Save provider account for login
        const providerAccounts = JSON.parse(localStorage.getItem('providerAccounts')) || [];
        const providerAccount = {
            email: registrationData.email,
            password: registrationData.password,
            providerId: providerId
        };
        providerAccounts.push(providerAccount);
        localStorage.setItem('providerAccounts', JSON.stringify(providerAccounts));

        // Auto-login
        localStorage.setItem('loggedInProviderId', providerId);

        // Clear pending registration data
        sessionStorage.removeItem('pendingRegistration');

        // Show success
        showSuccess(registrationData.plan);

    } catch (error) {
        console.error('Registration completion error:', error);
        showError('Nastala chyba pri dokončovaní registrácie.');
    }
}

async function completeRegistrationFromStorage() {
    const pendingDataStr = sessionStorage.getItem('pendingRegistration');

    if (!pendingDataStr) {
        showError('Registračné údaje sa nenašli.');
        return;
    }

    const pendingData = JSON.parse(pendingDataStr);

    // Complete registration without session ID (fallback)
    await completeRegistration(pendingData, null);
}

function showSuccess(plan) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('success-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';

    // Set plan name
    const planNames = {
        'pro': 'Pro',
        'pro_plus': 'Pro+',
        'proplus': 'Pro+',
        'pro-plus': 'Pro+'
    };
    document.getElementById('plan-name').textContent = planNames[plan] || 'Pro';

    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 3000);
}

function showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('success-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}
