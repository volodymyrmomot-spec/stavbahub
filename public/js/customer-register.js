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

        // Check if email already exists
        const customers = JSON.parse(localStorage.getItem('customers') || '[]');
        const providers = JSON.parse(localStorage.getItem('customProviders') || '[]');

        const emailExists = customers.some(c => c.email === email) || providers.some(p => p.email === email);

        if (emailExists) {
            showError('Tento email je už zaregistrovaný.');
            return;
        }

        // Create customer account
        const newCustomer = {
            id: 'customer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            email: email,
            password: password, // In production, this should be hashed
            phone: phone || '',
            role: 'customer',
            created_at: new Date().toISOString()
        };

        // Save to localStorage
        customers.push(newCustomer);
        localStorage.setItem('customers', JSON.stringify(customers));

        // Auto-login
        localStorage.setItem('loggedInCustomerId', newCustomer.id);
        localStorage.setItem('loggedInCustomer', JSON.stringify(newCustomer));

        // Show success message
        showSuccess('Účet bol úspešne vytvorený! Presmerovávame vás...');

        // Redirect to customer dashboard after short delay
        setTimeout(() => {
            window.location.href = 'customer-dashboard.html';
        }, 1500);
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
