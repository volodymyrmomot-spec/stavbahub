// Customer Registration Logic
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('register-customer-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const name = formData.get('name').trim();
        const email = formData.get('email').trim().toLowerCase();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');
        const phone = formData.get('phone').trim();

        // Clear previous errors
        clearErrors();

        // Validation
        if (!name) {
            showError('Meno je povinné.');
            return;
        }

        if (!email) {
            showError('Email je povinný.');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Neplatný formát emailu.');
            return;
        }

        if (!password) {
            showError('Heslo je povinné.');
            return;
        }

        if (password.length < 6) {
            showError('Heslo musí mať aspoň 6 znakov.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Heslá sa nezhodujú.');
            return;
        }

        // Create customer account payload
        const customerData = {
            name: name,
            email: email,
            password: password,
            phone: phone || '',
            role: 'customer'
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registrácia zlyhala.');
            }

            // Success - mimic the login response structure
            const user = data.user || data.customer || data.provider; // adapt to whatever backend returns

            // Save to localStorage for session management
            if (user) {
                localStorage.setItem('loggedInCustomerId', user.id);
                localStorage.setItem('loggedInCustomer', JSON.stringify(user));
            }

            showSuccess('Účet bol úspešne vytvorený! Presmerovávame vás...');

            // Redirect to customer dashboard
            setTimeout(() => {
                window.location.href = 'customer-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Registration error:', error);
            showError(error.message || 'Chyba pri registrácii. Skúste to znova.');
        }
    });

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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
