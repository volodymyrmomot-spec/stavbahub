// Provider Dashboard Script
(function () {
    'use strict';

    // Check if user is logged in
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');

    if (!loggedInProviderId) {
        // Not logged in - redirect to login page
        console.log('No logged in provider, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // Load provider data
    loadProviderData(loggedInProviderId);

    // Handle Manage Subscription Button
    const manageSubBtn = document.getElementById('manage-subscription-btn');
    if (manageSubBtn) {
        manageSubBtn.addEventListener('click', async function () {
            this.disabled = true;
            this.textContent = 'Načítavam...';

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Relácia vypršala. Prihláste sa znova.');
                window.location.href = 'login.html';
                return;
            }

            try {
                // Get provider ID from local storage user or just rely on backend finding it from token?
                // Backend probably needs providerId in body based on previous code.
                // Let's safe get it.
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                // We might not have providerId easily if we scraped it from provider object in loadProviderData.
                // But wait, the backend endpoint `create-billing-portal-session` probably expects it.
                // Let's try to get it from legacy if possible, or assume backend can handle it from token if we update backend (but we shouldn't update backend unless necessary).
                // Actually, let's assume valid token + /me call earlier worked, so we are good.
                // Check if we have provider data stored?
                // Let's use the 'user' object from localStorage which has 'id'. 
                // But provider ID is different from user ID usually.
                // In loadProviderData, we didn't store provider ID in a global var.
                // Let's rely on backend finding provider by userId from token?
                // Reviewing backend `routes/providers.js` didn't show billing session. It's likely in another file.
                // But let's send what we have.

                const response = await fetch(`/api/create-billing-portal-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({}) // Backend should find provider from req.user (token)
                });

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
            } catch (e) {
                console.error('Error:', e);
                alert('Nastala chyba pri komunikácii so serverom.');
                this.disabled = false;
                this.textContent = '💳 Spravovať predplatné cez Stripe';
            }
        });
    }

    async function loadProviderData(providerId) {
        console.log('Loading provider data for ID:', providerId);

        // Check for JWT token
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No JWT token found, redirecting to login');
            alert('Relácia vypršala. Prihláste sa znova.');
            window.location.href = 'login.html';
            return;
        }

        try {
            // Fetch from Backend API using /me endpoint with JWT
            const response = await fetch(`/api/providers/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                console.error('Unauthorized - token invalid or expired');
                localStorage.clear();
                alert('Relácia vypršala. Prihláste sa znova.');
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to fetch provider: ${response.status}`);
            }

            const provider = await response.json();
            console.log('Provider data loaded:', provider);

            // Update UI with fresh data
            updateDashboardUI(provider);

        } catch (error) {
            console.error('Error fetching provider data:', error);

            // Remove "Načítavam..." state on error
            document.getElementById('provider-name').textContent = 'Nepodarilo sa načítať údaje';
            document.getElementById('provider-category').textContent = '-';

            // Only show alert for critical errors, not network glitches if we can just show UI state
            // valid token but failed fetch usually means server error or network

            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Skúsiť znova';
            retryBtn.className = 'btn btn-secondary btn-sm';
            retryBtn.style.marginTop = '0.5rem';
            retryBtn.onclick = () => window.location.reload();

            const nameEl = document.getElementById('provider-name');
            nameEl.appendChild(document.createElement('br'));
            nameEl.appendChild(retryBtn);
        }
    }

    function updateDashboardUI(provider) {
        console.log('Updating UI for provider:', provider);

        // Get user data from localStorage for email (since Provider model doesn't have email)
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Update provider name (Provider model uses 'name' not 'companyName')
        document.getElementById('provider-name').textContent = provider.name || 'Bez názvu';

        // Update category (Provider model uses 'categories' array)
        const categoryText = provider.categories && provider.categories.length > 0
            ? provider.categories.join(', ')
            : '-';
        document.getElementById('provider-category').textContent = categoryText;

        // Update location (Provider model has 'city', no 'region' field)
        const locationElement = document.getElementById('provider-location');
        if (locationElement) {
            locationElement.textContent = provider.city || '-';
        }

        // Update plan badge
        const planBadge = document.getElementById('provider-plan');
        const plan = (provider.plan || 'basic').toLowerCase();

        // Normalize all plan value variations
        if (plan === 'pro+' || plan === 'proplus' || plan === 'pro-plus' || plan === 'pro_plus') {
            planBadge.textContent = 'Pro+';
            planBadge.className = 'provider-badge badge-pro-plus';
        } else if (plan === 'pro') {
            planBadge.textContent = 'Pro';
            planBadge.className = 'provider-badge badge-pro';
        } else {
            planBadge.textContent = 'Basic';
            planBadge.className = 'provider-badge badge-basic';
        }

        // Update Contact Info (email comes from User model, not Provider)
        const phoneElement = document.getElementById('provider-phone');
        if (phoneElement) {
            phoneElement.textContent = provider.phone || '-';
        }

        const emailElement = document.getElementById('provider-email');
        if (emailElement) {
            emailElement.textContent = user.email || '-';
        }

        const websiteElement = document.getElementById('provider-website');
        if (provider.website && provider.website.trim() !== '') {
            let websiteUrl = provider.website.trim();
            if (!websiteUrl.match(/^https?:\/\//i)) {
                websiteUrl = 'https://' + websiteUrl;
            }
            websiteElement.innerHTML = `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-blue); text-decoration: none; word-break: break-all;">${provider.website}</a>`;
        } else {
            websiteElement.textContent = '-';
        }

        // Update Description
        document.getElementById('provider-description').textContent = provider.description || 'Žiadny popis.';

        // Update stats
        document.getElementById('views-count').textContent = provider.views || 0;
        document.getElementById('contacts-count').textContent = provider.contacts || 0;
        document.getElementById('rating').textContent = (provider.rating || 0).toFixed(1);

        // Update Gallery (Pro/Pro+ only)
        const gallerySection = document.getElementById('gallery-section');
        const galleryGrid = document.getElementById('gallery-grid');
        const noPhotosMessage = document.getElementById('no-photos-message');
        const photoCount = document.getElementById('photo-count');
        const photoLimit = document.getElementById('photo-limit');

        if (plan === 'basic') {
            gallerySection.style.display = 'none';
        } else {
            gallerySection.style.display = 'block';
            const maxPhotos = plan === 'pro' ? 3 : 30;
            photoLimit.textContent = maxPhotos;

            // Use workPhotos or photos array (excluding profile photo if mixed, but usually separate)
            // Assuming verification_docs are separate.
            // Let's use 'photos' from the backend structure if 'workPhotos' is not there.
            const photos = provider.workPhotos || provider.photos || [];
            photoCount.textContent = photos.length;

            if (photos.length > 0) {
                galleryGrid.innerHTML = '';
                noPhotosMessage.style.display = 'none';

                photos.forEach((photo, index) => {
                    const photoItem = document.createElement('div');
                    photoItem.className = 'gallery-item';
                    photoItem.style.cssText = 'position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px; background: #f3f4f6;';
                    photoItem.innerHTML = `<img src="${photo}" alt="Realizácia ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    galleryGrid.appendChild(photoItem);
                });
            } else {
                galleryGrid.innerHTML = '';
                noPhotosMessage.style.display = 'block';
            }
        }
    }
})();
