document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Clear previous messages
        clearMessages();

        // UI: Disable button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrujem...';

        try {
            // 1. Collect and Validate Data
            const formData = new FormData(form);
            const data = {
                companyName: formData.get('company-name'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirm-password'),
                region: formData.get('region'),
                city: formData.get('city'),
                category: formData.get('category'),
                plan: formData.get('plan'),
                description: formData.get('description'),
                phone: formData.get('phone')
            };

            // Validation
            if (!data.companyName || !data.email || !data.password || !data.region || !data.city || !data.category || !data.plan) {
                throw new Error('Prosím, vyplňte všetky povinné polia.');
            }

            if (data.password !== data.confirmPassword) {
                throw new Error('Heslá sa nezhodujú.');
            }

            if (data.password.length < 6) {
                throw new Error('Heslo musí mať aspoň 6 znakov.');
            }

            // Photo Validation (Optional)
            const photoInput = document.getElementById('profile-photo');
            let photoBase64 = null;
            if (photoInput && photoInput.files && photoInput.files[0]) {
                const file = photoInput.files[0];
                if (file.size > 5 * 1024 * 1024) throw new Error('Fotka je príliš veľká (max 5MB).');
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) throw new Error('Nepodporovaný formát fotky (iba JPG, PNG, WEBP).');

                photoBase64 = await readFileAsBase64(file);
            }

            // 2. Register User (Auth)
            const authPayload = {
                email: data.email,
                password: data.password,
                name: data.companyName,
                role: 'provider'
            };

            const registerUrl = `${API_BASE_URL}/api/auth/register`;
            const authRes = await fetch(registerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authPayload)
            });

            const authResult = await authRes.json();

            if (!authRes.ok) {
                throw new Error(authResult.error || authResult.message || 'Registrácia zlyhala.');
            }

            // 3. Handle Success & Token
            if (authResult.token) {
                localStorage.setItem('token', authResult.token);
            }

            const user = authResult.provider || authResult.user;
            if (user) {
                // Ensure we save it in a consistent format for auth-state.js
                // auth-state.js looks for 'loggedInProviderId' and 'customProviders' array or 'localStorage.getItem("loggedInProvider")' (?)
                // Actually auth-state.js line 22: const providers = JSON.parse(localStorage.getItem('customProviders') || '[]');
                // This seems to be legacy "local" logic.
                // But wait, line 113 of original provider-register.js: 
                // localStorage.setItem('loggedInProviderId', providerId);
                // localStorage.setItem('loggedInProvider', JSON.stringify(registerResult.provider));

                // I will maintain this legacy state for compatibility with existing dashboard code
                localStorage.setItem('loggedInProviderId', user.id);
                localStorage.setItem('loggedInProvider', JSON.stringify(user));
            }

            const userId = user ? user.id : (authResult.id || null);

            // 4. Create Provider Profile (Optional Secondary Step)
            // Only if we have a userId to link it to, and if the endpoint exists.
            if (userId) {
                try {
                    const profilePayload = {
                        userId: userId,
                        companyName: data.companyName,
                        region: data.region,
                        city: data.city,
                        category: data.category,
                        plan: data.plan,
                        description: data.description,
                        phone: data.phone,
                        photo: photoBase64
                    };

                    // Optimistically try to update profile/provider details
                    // We don't fail registration if this fails, as the user is already created
                    await fetch(`${API_BASE_URL}/api/providers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(authResult.token ? { 'Authorization': `Bearer ${authResult.token}` } : {})
                        },
                        body: JSON.stringify(profilePayload)
                    });
                } catch (profileErr) {
                    console.warn('Profile creation step failed or endpoint not found:', profileErr);
                    // Continue, as account is created
                }
            }

            // 5. Success UI
            showSuccess('Registrácia úspešná! Presmerovávame...');

            if (data.plan !== 'basic') {
                // Initial message about payment logic
                const msg = document.createElement('div');
                msg.className = 'alert alert-info';
                msg.style.marginTop = '0.5rem';
                msg.textContent = 'Poznámka: Platba bude aktivovaná neskôr. Zatiaľ máte prístup zadarmo.';
                document.querySelector('.card h1').after(msg);
            }

            setTimeout(() => {
                window.location.href = 'provider-dashboard.html';
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            showError(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    function showError(msg) {
        const div = document.createElement('div');
        div.className = 'alert alert-error';
        div.textContent = msg;
        const title = document.querySelector('.card h1');
        title.after(div);
    }

    function showSuccess(msg) {
        const div = document.createElement('div');
        div.className = 'alert alert-success';
        div.textContent = msg;
        const title = document.querySelector('.card h1');
        title.after(div);
    }

    function clearMessages() {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(el => el.remove());
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
});
