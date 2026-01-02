// Providers Loader - Dynamically load and filter providers from API

(function () {
    'use strict';

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const region = urlParams.get('region');
    const serviceType = urlParams.get('service_type');

    // API Call function with filter parameters
    function fetchProviders(filters = {}) {
        return new Promise((resolve, reject) => {
            // Construct query string
            const params = new URLSearchParams();
            if (filters.region) params.append('region', filters.region);
            if (filters.category) params.append('category', filters.category);
            if (filters.city) params.append('city', filters.city);
            if (filters.q) params.append('q', filters.q);

            if (filters.plan && filters.plan.trim() !== '') params.append('plan', filters.plan);

            const url = `/api/providers?${params.toString()}`;
            console.log('Fetching providers from:', url);

            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    console.log('Providers loaded from API:', data.length);

                    // Merge with local storage for custom providers (if any)
                    // This ensures locally created providers are still visible until they are saved to DB
                    let customProviders = [];
                    try {
                        const stored = localStorage.getItem('customProviders');
                        if (stored) {
                            customProviders = JSON.parse(stored);
                        }
                    } catch (e) {
                        console.error('Error reading from localStorage', e);
                    }

                    // We need to filter custom providers manually since API won't return them
                    if (customProviders.length > 0) {
                        // Apply same filters to custom providers
                        customProviders = customProviders.filter(p => {
                            let match = true;
                            if (filters.region && !p.region.includes(filters.region)) match = false;
                            if (filters.category) {
                                const pCat = (p.category || p.service_type || '').toLowerCase();
                                const fCat = filters.category.toLowerCase();
                                if (pCat !== fCat && !pCat.includes(fCat)) match = false;
                            }
                            if (filters.city && !(p.city || '').toLowerCase().includes(filters.city.toLowerCase())) match = false;
                            if (filters.plan && filters.plan.trim() !== '') {
                                const pPlan = (p.plan || 'basic').toLowerCase();
                                const fPlan = filters.plan.toLowerCase();
                                if (fPlan === 'pro' && pPlan !== 'pro') match = false;
                                if ((fPlan === 'pro+' || fPlan === 'pro-plus') && (pPlan !== 'pro+' && pPlan !== 'pro-plus' && pPlan !== 'proplus')) match = false;
                                if (fPlan === 'basic' && pPlan !== 'basic') match = false;
                            }
                            return match;
                        });
                    }

                    // Merge API data and filtered custom providers
                    // Avoid duplicates if custom provider is also in API (by ID)
                    const apiIds = new Set(data.map(p => p.id));
                    const uniqueCustom = customProviders.filter(p => !apiIds.has(p.id));

                    const allProviders = [...data, ...uniqueCustom];

                    resolve(allProviders);
                })
                .catch(error => {
                    console.error('Error fetching providers:', error);
                    reject(error);
                });
        });
    }

    // Function to sort providers by plan
    function sortProvidersByPlan(providers) {
        const planPriority = {
            'pro+': 1,
            'proplus': 1,
            'pro-plus': 1,
            'pro': 2,
            'basic': 3
        };

        return providers.sort((a, b) => {
            const planA = (a.plan || 'basic').toLowerCase();
            const planB = (b.plan || 'basic').toLowerCase();
            const priorityA = planPriority[planA] || 999;
            const priorityB = planPriority[planB] || 999;

            // First sort by plan priority
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // Within same plan, sort by rating (optional)
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingB - ratingA;
        });
    }

    // Function to generate stars
    function generateStars(rating) {
        const fullStars = Math.floor(rating);
        return '⭐'.repeat(fullStars);
    }

    // Function to get plan badge class
    function getPlanBadgeClass(plan) {
        const planLower = (plan || 'basic').toLowerCase();
        if (planLower === 'pro+' || planLower === 'proplus' || planLower === 'pro-plus') return 'badge-pro-plus';
        if (planLower === 'pro') return 'badge-pro';
        return 'badge-basic';
    }

    // Function to get plan display name
    function getPlanDisplayName(plan) {
        const planLower = (plan || 'basic').toLowerCase();
        if (planLower === 'pro+' || planLower === 'proplus' || planLower === 'pro-plus') return 'Pro+';
        if (planLower === 'pro') return 'Pro';
        return 'Basic';
    }

    // Function to render provider card
    function renderProviderCard(provider) {
        const plan = (provider.plan || 'basic').toLowerCase();
        const planClass = (plan === 'pro+' || plan === 'proplus' || plan === 'pro-plus') ? 'plan-pro-plus' : plan === 'pro' ? 'plan-pro' : 'plan-basic';
        const badgeClass = getPlanBadgeClass(plan);
        const planDisplay = getPlanDisplayName(plan);
        const stars = generateStars(provider.rating || 5);
        const reviewsCount = provider.reviews_count || 0;

        // Profile Photo Logic
        let photoHtml = '';
        if (provider.profilePhotoData || provider.profilePhotoUrl) {
            photoHtml = `<img src="${provider.profilePhotoData || provider.profilePhotoUrl}" alt="${provider.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            photoHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏢</div>`;
        }

        // Website Logic
        let websiteHtml = '';
        if (provider.website && provider.website.trim() !== '') {
            let websiteUrl = provider.website.trim();
            if (!websiteUrl.match(/^https?:\/\//i)) {
                websiteUrl = 'https://' + websiteUrl;
            }
            websiteHtml = `<div>🌐 <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color: var(--primary-blue); text-decoration: none;">Webstránka</a></div>`;
        }

        let card = `
            <article class="card provider-card ${planClass}" 
                     data-region="${provider.region || ''}" 
                     data-service-type="${provider.service_type || ''}"
                     data-name="${provider.name || ''}"
                     onclick="location.href='provider-detail.html?id=${provider.id || ''}&plan=${plan}'"
                     style="cursor: pointer;">
                
                <div class="card-header-row" style="display: flex; gap: 1rem; align-items: start; margin-bottom: 1rem;">
                    <!-- Profile Photo -->
                    <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; background: #f3f4f6; flex-shrink: 0; border: 1px solid #e5e7eb;">
                        ${photoHtml}
                    </div>
                    
                    <div style="flex-grow: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <h3 class="card-title" style="font-size: 1.1rem; margin-bottom: 0.25rem;">${provider.name || 'Bez názvu'}</h3>
                            <span class="plan-badge ${badgeClass}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">${planDisplay}</span>
                        </div>
                        <div class="provider-meta">
                            <span class="tag" style="font-size: 0.8rem;">${provider.region || ''}</span>
                            ${provider.service_type ? `<span class="tag" style="font-size: 0.8rem;">${provider.service_type}</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Contact Info -->
                <div style="margin-bottom: 1rem; font-size: 0.9rem; color: #4b5563; display: flex; flex-direction: column; gap: 0.25rem;">
                    <div>📞 ${provider.phone || '-'}</div>
                    ${websiteHtml}
                </div>

                <!-- Description -->
                <p class="card-text" style="margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${provider.description || 'Profesionálne služby.'}
                </p>
        `;

        // Add photos based on plan
        const workPhotos = provider.workPhotos || [];

        if (plan === 'pro') {
            // Pro: Show up to 3 photos
            if (workPhotos.length > 0) {
                card += `<div class="provider-photos-preview">`;
                // Show max 3 photos or placeholders if needed (but user requested real data only)
                // We will show only available photos
                for (let i = 0; i < 3; i++) {
                    if (workPhotos[i]) {
                        card += `<div class="photo-preview-item" style="background-image: url('${workPhotos[i]}'); background-size: cover; background-position: center;"></div>`;
                    } else {
                        // Optional: show placeholder or nothing. Let's show nothing to be cleaner.
                        card += `<div class="photo-preview-item" style="background: #f3f4f6;"></div>`;
                    }
                }
                card += `</div>`;
            }
        } else if (plan === 'pro+' || plan === 'proplus' || plan === 'pro-plus') {
            // Pro+: Show larger gallery preview
            if (workPhotos.length > 0) {
                card += `<div class="provider-photos-gallery-large">`;
                // Main large photo
                card += `<div class="gallery-large-main" style="background-image: url('${workPhotos[0]}'); background-size: cover; background-position: center;"></div>`;

                // Sub photos
                for (let i = 1; i < 4; i++) {
                    if (workPhotos[i]) {
                        card += `<div class="gallery-large-sub" style="background-image: url('${workPhotos[i]}'); background-size: cover; background-position: center;"></div>`;
                    } else {
                        card += `<div class="gallery-large-sub" style="background: #f3f4f6;"></div>`;
                    }
                }
                card += `</div>`;
            }
        }

        // Rating
        card += `
                <div class="provider-rating" style="margin-top: auto; padding-top: 1rem;">
                    <span class="stars">${stars}</span>
                    ${reviewsCount > 0 ? `<span class="reviews-count">(${reviewsCount})</span>` : ''}
                </div>
                <a href="provider-detail.html?id=${provider.id || ''}&plan=${plan}" 
                   class="btn btn-outline" 
                   style="margin-top: 1rem; width: 100%;">Zobraziť detail</a>
            </article>
        `;

        return card;
    }

    // Function to render providers
    function renderProviders(providers) {
        const container = document.getElementById('providers-container');
        const noResultsMessage = document.getElementById('no-results-message');

        if (!container) {
            console.error('Providers container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        if (!providers || providers.length === 0) {
            // Show no results message
            if (noResultsMessage) {
                noResultsMessage.style.display = 'block';
            }
            return;
        }

        // Hide no results message
        if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }

        // Sort providers by plan
        const sortedProviders = sortProvidersByPlan(providers);

        // Render each provider
        sortedProviders.forEach(provider => {
            container.innerHTML += renderProviderCard(provider);
        });
    }

    // Load providers using API
    function loadProviders(filters = {}) {
        fetchProviders(filters)
            .then(data => {
                renderProviders(data);
            })
            .catch(error => {
                console.error('Error loading providers:', error);
                // Show no results message on error
                const noResultsMessage = document.getElementById('no-results-message');
                if (noResultsMessage) {
                    noResultsMessage.textContent = 'Nastala chyba pri načítaní údajov.';
                    noResultsMessage.style.display = 'block';
                }
            });
    }

    // Handle form submission
    function setupFilterForm() {
        const form = document.querySelector('.search-form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                // Get form values
                const formData = new FormData(form);
                const filters = {
                    region: formData.get('region') || '',
                    city: formData.get('city') || '',
                    category: formData.get('category') || '',
                    plan: formData.get('plan') || ''
                };

                console.log('Form filters:', filters);

                // Load providers with filters
                loadProviders(filters);
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            loadProviders();
            setupFilterForm();
        });
    } else {
        loadProviders();
        setupFilterForm();
    }

})();
