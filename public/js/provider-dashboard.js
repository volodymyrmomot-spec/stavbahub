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

            try {
                const response = await fetch('/api/create-billing-portal-session', {
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

        try {
            // Fetch from Backend API
            const response = await fetch(`/api/provider/${providerId}`);
            if (!response.ok) throw new Error('Failed to fetch provider');

            const provider = await response.json();

            // Update UI with fresh data
            updateDashboardUI(provider);

            // Update localStorage for other pages to use
            // We need to merge with existing customProviders if we want to keep that structure,
            // or just rely on API. For now, let's update the specific provider in localStorage if it exists there.
            let customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
            const idx = customProviders.findIndex(p => p.id === providerId);
            if (idx !== -1) {
                customProviders[idx] = { ...customProviders[idx], ...provider };
                localStorage.setItem('customProviders', JSON.stringify(customProviders));
            }

        } catch (error) {
            console.error('Error fetching from API, falling back to localStorage:', error);
            // Fallback to localStorage
            const staticProviders = window.providersData || [];
            const customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
            const allProviders = [...staticProviders, ...customProviders];
            const provider = allProviders.find(p => p.id === providerId);

            if (provider) {
                updateDashboardUI(provider);
            } else {
                console.error('Provider not found anywhere');
                alert('Chyba: Údaje sa nepodarilo načítať.');
            }
        }
    }

    function updateDashboardUI(provider) {
        console.log('Updating UI for provider:', provider);

        // Update profile photo
        const photoElement = document.getElementById('provider-photo');
        const photoPlaceholder = document.getElementById('provider-photo-placeholder');

        // Check for photo URL or base64 data
        const photoSrc = provider.profilePhotoUrl || provider.profilePhotoData || (provider.photos && provider.photos[0]);

        if (photoSrc) {
            photoElement.src = photoSrc;
            photoElement.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        } else {
            photoElement.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
        }

        // Update provider name
        document.getElementById('provider-name').textContent = provider.name || provider.companyName || 'Bez názvu';

        // Update category
        const categoryText = provider.service_type || provider.category || '-';
        document.getElementById('provider-category').textContent = categoryText;

        // Update region
        const regionText = provider.region || '-';
        document.getElementById('provider-region').textContent = `Kraj: ${regionText}`;

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

        // Update Contact Info
        document.getElementById('provider-phone').textContent = provider.phone || '-';
        document.getElementById('provider-email').textContent = provider.email || '-';

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
