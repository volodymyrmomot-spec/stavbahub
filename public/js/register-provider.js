
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('firm-register-form');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // 1. Collect Form Data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // 2. Basic Validation (HTML5 validation handles most, but good to be safe)
            if (!data.name || !data.contact_person || !data.email || !data.region || !data.category || !data.plan) {
                alert('Prosím, vyplňte všetky povinné polia.');
                return;
            }

            if (!data.password || !data.confirmPassword) {
                alert('Prosím, zadajte heslo a potvrdenie hesla.');
                return;
            }

            if (data.password !== data.confirmPassword) {
                alert('Heslá sa nezhodujú.');
                return;
            }

            // Validate description for Basic plan
            if (data.plan === 'basic' && data.description) {
                const phonePattern = /(\+?\d{1,4}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
                const urlPattern = /(https?:\/\/|www\.|\.sk|\.cz|\.com|\.eu|\.org|\.net)/gi;

                if (phonePattern.test(data.description)) {
                    alert('Pre Basic plán nie je dovolené uvádzať telefónne číslo v popise firmy.');
                    return;
                }

                if (urlPattern.test(data.description)) {
                    alert('Pre Basic plán nie je dovolené uvádzať webstránku v popise firmy.');
                    return;
                }
            }

            // 3. Create Provider Object
            const providerId = 'custom_' + Date.now();
            const plan = data.plan;

            // Determine priority weight based on plan
            let priorityWeight = 1; // Basic
            if (plan === 'pro') priorityWeight = 2;
            if (plan === 'proplus' || plan === 'pro+') priorityWeight = 3;

            const newProvider = {
                id: providerId,
                name: data.name,
                region: data.region,
                city: data.city,
                category: data.category, // Save normalized category
                service_type: data.category, // Save as service_type for backward compatibility
                subcategory: data.category, // Using category as subcategory for simplicity
                description: data.description || 'Popis služby nebol zadaný.',
                plan: plan,
                rating: 0,
                reviews_count: 0,
                email: data.email,
                phone: data.phone,
                contact_person: data.contact_person,
                is_verified: false,
                priority_weight: priorityWeight,
                advantages: ['Nová firma', 'Overená registrácia'] // Default advantages
            };

            // 4. Save to LocalStorage
            // Get existing custom providers or initialize empty array
            let customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
            customProviders.push(newProvider);
            localStorage.setItem('customProviders', JSON.stringify(customProviders));

            // Save Provider Account (Prototype only - plain text password)
            const providerAccount = {
                email: data.email,
                password: data.password,
                providerId: providerId
            };
            let providerAccounts = JSON.parse(localStorage.getItem('providerAccounts')) || [];
            providerAccounts.push(providerAccount);
            localStorage.setItem('providerAccounts', JSON.stringify(providerAccounts));

            // 5. Update Global Data (for current session if needed, though redirect will reload)
            if (window.providersData) {
                window.providersData.push(newProvider);
            }

            // 6. Success & Redirect
            alert('Vaša firma bola úspešne zaregistrovaná.');

            // Redirect to providers list filtered by the new provider's region and service
            const redirectUrl = `providers.html?region=${encodeURIComponent(data.region)}&service_type=${encodeURIComponent(data.service_type)}`;
            window.location.href = redirectUrl;
        });
    }
});
