// Provider Registration Script - Backend Integrated
document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('register-form');
    let stripeConfig = null;

    // Fetch Stripe Config
    try {
        const res = await fetch(`${API_BASE_URL}/api/config`);
        stripeConfig = await res.json();
    } catch (e) {
        console.error('Failed to load Stripe config', e);
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Clear any previous error messages
            const existingError = document.querySelector('.alert-error');
            if (existingError) existingError.remove();

            // 1. Collect Form Data
            const formData = new FormData(form);
            const data = {
                name: formData.get('company-name'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirm_password: formData.get('confirm-password'),
                region: formData.get('region'),
                city: formData.get('city'),
                service_type: formData.get('category'),
                plan: formData.get('plan'),
                description: formData.get('description') || '',
                phone: formData.get('phone') || ''
            };

            // Handle Profile Photo
            const photoInput = document.getElementById('profile-photo');
            let profilePhotoData = null;

            if (photoInput && photoInput.files && photoInput.files[0]) {
                const file = photoInput.files[0];

                // Validate size (5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showError('Profilová fotka je príliš veľká. Maximálna veľkosť je 5MB.');
                    return;
                }

                // Validate type
                if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
                    showError('Neplatný formát fotky. Použite JPG, PNG alebo WEBP.');
                    return;
                }

                // Convert to Base64
                try {
                    profilePhotoData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = (e) => reject(e);
                        reader.readAsDataURL(file);
                    });
                } catch (e) {
                    console.error('Error reading photo:', e);
                    showError('Chyba pri načítaní fotky.');
                    return;
                }
            }

            // 2. Basic Validation
            if (!data.name || !data.email || !data.password || !data.region || !data.city || !data.service_type || !data.plan) {
                showError('Prosím, vyplňte všetky povinné polia.');
                return;
            }

            if (data.password !== data.confirm_password) {
                showError('Heslá sa nezhodujú.');
                return;
            }

            if (data.password.length < 6) {
                showError('Heslo musí mať aspoň 6 znakov.');
                return;
            }

            try {
                // Prepare registration data
                const registrationData = {
                    ...data,
                    profilePhotoData: profilePhotoData
                };

                // 3. Register via Backend API
                // We add role: 'provider' to ensure backend knows the user type
                const payload = { ...registrationData, role: 'provider' };

                const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const registerResult = await registerResponse.json();

                if (!registerResponse.ok) {
                    throw new Error(registerResult.error || 'Registrácia zlyhala.');
                }

                const providerId = registerResult.provider.id;

                // Auto-login (save to localStorage)
                localStorage.setItem('loggedInProviderId', providerId);
                localStorage.setItem('loggedInProvider', JSON.stringify(registerResult.provider));

                // 4. Handle Plan
                if (data.plan === 'basic') {
                    showSuccess('Registrácia bola úspešná! Presmerovávame vás...');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    // Pro / Pro+ -> Redirect to Stripe Checkout
                    await redirectToStripeCheckout(providerId, data.plan);
                }

            } catch (error) {
                console.error('Registration error:', error);
                showError(error.message || 'Registrácia zlyhala. Skúste to znova.');
            }
        });
    }

    // Redirect to Stripe Checkout using Backend API
    async function redirectToStripeCheckout(providerId, plan) {
        if (!stripeConfig || !stripeConfig.prices) {
            showError('Chyba konfigurácie platobnej brány.');
            return;
        }

        const priceId = stripeConfig.prices[plan];
        if (!priceId) {
            showError('Neplatný plán.');
            return;
        }

        showSuccess('Presmerovávame vás na platobnú bránu...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: priceId,
                    providerId: providerId
                })
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                showError('Chyba pri vytváraní platby: ' + (data.error || 'Neznáma chyba'));
            }
        } catch (e) {
            console.error(e);
            showError('Chyba pri komunikácii so serverom.');
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.style.marginBottom = '1rem';
        errorDiv.textContent = message;

        const formCard = document.querySelector('.card');
        const title = formCard.querySelector('h1');
        title.insertAdjacentElement('afterend', errorDiv);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.marginBottom = '1rem';
        successDiv.textContent = message;

        const formCard = document.querySelector('.card');
        const title = formCard.querySelector('h1');
        title.insertAdjacentElement('afterend', successDiv);
    }
});
