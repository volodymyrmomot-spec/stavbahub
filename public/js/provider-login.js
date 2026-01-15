// Login Logic - Supports both Customers and Providers
// Fixed to support multiple storage formats for backward compatibility
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('login-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const email = formData.get('email').trim();
        const password = formData.get('password');

        // Clear previous errors
        clearErrors();

        // Validation
        if (!email || !password) {
            showError('Prosím vyplňte všetky polia.');
            return;
        }

        // Try to login via API
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                // Display the actual backend error message
                showError(data.error || data.message || 'Nesprávny email alebo heslo.');
                return;
            }

            const data = await response.json();
            console.log('Login response:', data);

            if (data.ok && data.token && data.user) {
                // Normalize user object (backend returns _id, we need id)
                const user = {
                    id: data.user.id || data.user._id,
                    email: data.user.email,
                    role: data.user.role,
                    name: data.user.name
                };

                console.log('Saving to localStorage:', { token: data.token, user });

                // Login successful - store token and user
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(user));

                // Also maintain legacy keys for backward compatibility
                if (user.role === 'customer') {
                    localStorage.setItem('loggedInCustomerId', user.id);
                    localStorage.setItem('loggedInCustomer', JSON.stringify(user));
                } else if (user.role === 'provider') {
                    localStorage.setItem('loggedInProviderId', user.id);
                    localStorage.setItem('loggedInProvider', JSON.stringify(user));
                }

                console.log('localStorage after save:', {
                    token: localStorage.getItem('token'),
                    user: localStorage.getItem('user')
                });

                showSuccess('Prihlásenie úspešné! Presmerovávame vás...');

                setTimeout(() => {
                    // Redirect based on role
                    if (user.role === 'provider') {
                        window.location.href = 'provider-dashboard.html';
                    } else if (user.role === 'customer') {
                        window.location.href = 'customer-dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } else {
                // Login failed
                showError('Nesprávny email alebo heslo.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Nepodarilo sa prihlásiť. Skontrolujte pripojenie.');
        }
    });

    function attemptLocalLogin(email, password) {
        // Try provider login - check multiple storage formats for backward compatibility

        // Method 1: Check providerAccounts (newer format with separate login credentials)
        const providerAccounts = JSON.parse(localStorage.getItem('providerAccounts') || '[]');
        const providerAccount = providerAccounts.find(acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password);

        if (providerAccount) {
            // Found in providerAccounts - use providerId to get full provider data
            const customProviders = JSON.parse(localStorage.getItem('customProviders') || '[]');
            const provider = customProviders.find(p => p.id === providerAccount.providerId);

            if (provider) {
                localStorage.setItem('loggedInProviderId', provider.id);
                return {
                    success: true,
                    redirectUrl: 'dashboard.html',
                    userType: 'provider'
                };
            }
        }

        // Method 2: Check customProviders directly (older format with password in provider object)
        const customProviders = JSON.parse(localStorage.getItem('customProviders') || '[]');
        const providerDirect = customProviders.find(p => {
            const providerEmail = (p.email || '').toLowerCase();
            return providerEmail === email.toLowerCase() && p.password === password;
        });

        if (providerDirect) {
            localStorage.setItem('loggedInProviderId', providerDirect.id);
            return {
                success: true,
                redirectUrl: 'dashboard.html',
                userType: 'provider'
            };
        }

        // Try customer login
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const customer = customers.find(c => {
            const customerEmail = (c.email || '').toLowerCase();
            return customerEmail === email.toLowerCase() && c.password === password;
        });

        if (customer) {
            // Customer login
            localStorage.setItem('loggedInCustomerId', customer.id);
            localStorage.setItem('loggedInCustomer', JSON.stringify(customer));
            return {
                success: true,
                redirectUrl: 'customer-dashboard.html',
                userType: 'customer'
            };
        }

        // No match found
        return {
            success: false
        };
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.style.marginBottom = '1rem';
        errorDiv.textContent = message;
        errorDiv.id = 'error-message';

        const formCard = document.querySelector('.card');
        const title = formCard.querySelector('h1');
        title.insertAdjacentElement('afterend', errorDiv);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.marginBottom = '1rem';
        successDiv.textContent = message;
        successDiv.id = 'success-message';

        const formCard = document.querySelector('.card');
        const title = formCard.querySelector('h1');
        title.insertAdjacentElement('afterend', successDiv);
    }

    function clearErrors() {
        const existingError = document.getElementById('error-message');
        const existingSuccess = document.getElementById('success-message');

        if (existingError) {
            existingError.remove();
        }
        if (existingSuccess) {
            existingSuccess.remove();
        }
    }
});
