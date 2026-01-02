// Homepage Marketplace Functionality
const API_BASE = 'http://localhost:4000';

// State
let allProviders = [];
let filters = {
    city: '',
    category: '',
    search: ''
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilters();
    await loadProviders();
    setupEventListeners();
});

// Load filter options from API
async function loadFilters() {
    try {
        const response = await fetch(`${API_BASE}/api/meta/filters`);
        const data = await response.json();

        populateSelect('cityFilter', data.cities, 'Všetky mestá');
        populateSelect('categoryFilter', data.categories, 'Všetky kategórie');
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Populate select dropdown
function populateSelect(elementId, options, placeholder) {
    const select = document.getElementById(elementId);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// Load providers from API
async function loadProviders() {
    try {
        const params = new URLSearchParams();
        if (filters.city) params.append('city', filters.city);
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('q', filters.search);
        // We still ask backend for sorting, but we will enforce it client-side too
        params.append('sort', 'rating');

        const response = await fetch(`${API_BASE}/api/providers?${params.toString()}`);
        allProviders = await response.json();

        // Client-side sorting enforcement: Plan > Rating
        const planPriority = {
            'pro+': 3, 'pro_plus': 3, 'proplus': 3,
            'pro': 2,
            'basic': 1
        };

        allProviders.sort((a, b) => {
            const planA = (a.plan || 'basic').toLowerCase();
            const planB = (b.plan || 'basic').toLowerCase();

            const weightA = planPriority[planA] || 1;
            const weightB = planPriority[planB] || 1;

            if (weightA !== weightB) {
                return weightB - weightA; // Higher weight first
            }

            // Secondary sort: Rating desc
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            return ratingB - ratingA;
        });

        displayProviders();
    } catch (error) {
        console.error('Error loading providers:', error);
        displayError();
    }
}

// Display providers in the list
function displayProviders() {
    const container = document.getElementById('providersList');
    if (!container) return;

    if (allProviders.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>Nenašli sa žiadni poskytovatelia podľa vašich kritérií.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allProviders.map(provider => createProviderCard(provider)).join('');

    // Add click handlers to cards (optional, as we now have a button, but keeping card clickable is good UX)
    // However, if we have a button, maybe we only want the button to work? 
    // Requirement says "The button must link to...". 
    // Usually, clicking the whole card is fine too. Let's keep the button distinct.

    // We don't need the JS click handler for the whole card if the button handles it, 
    // but the previous code had it. Let's REMOVE the whole-card click listener to avoid conflict 
    // or double-actions, focusing user on the CTA as requested. 
    // Actually, "Keep the UI clean" -> usually whole card clickable is better, but I will stick to the requirement 
    // "Add one clear CTA button... The button must link". 
    // I will remove the JS event listener for the card to ensure the button is the primary visual cue, 
    // but the card itself won't be a link unless specifically asked.
    // The previous code added a click listener to `.provider-card`. I will remove that block to force use of the button, 
    // or make the button the only link. 
    // Let's remove the JS click listener block from displayProviders in the replacement below.
}

// Create provider card HTML
function createProviderCard(provider) {
    const planRaw = (provider.plan || 'basic').toLowerCase();
    let planClass = 'basic';
    let planDisplay = 'BASIC';

    if (planRaw === 'pro+' || planRaw === 'pro_plus' || planRaw === 'proplus') {
        planClass = 'pro-plus';
        planDisplay = 'PRO+';
    } else if (planRaw === 'pro') {
        planClass = 'pro';
        planDisplay = 'PRO';
    }

    const rating = provider.rating || 0;
    const categories = provider.category || provider.service_type || '';

    return `
        <div class="provider-card" data-id="${provider.id}">
            <div class="provider-header">
                <h3 class="provider-name">${provider.name}</h3>
                <span class="plan-badge ${planClass}">${planDisplay}</span>
            </div>
            <div class="provider-body">
                <p class="provider-city">📍 ${provider.city}</p>
                <p class="provider-categories">${categories}</p>
                <div class="provider-rating-section" style="margin-bottom: 1rem;">
                     ⭐ ${rating.toFixed(1)} <span style="color: #64748b; font-size: 0.875rem;">(${provider.reviews_count || 0} hodnotení)</span>
                </div>
                ${provider.is_verified ? '<div class="verified-badge" style="margin-bottom: 1rem; display: inline-flex;">✓ Overený</div>' : ''}
                
                <a href="provider-detail.html?id=${provider.id}" class="btn btn-primary" style="width: 100%; display: block; text-align: center; margin-top: 1rem;">
                    Kontaktovať majstra
                </a>
            </div>
        </div>
    `;
}

// Format plan name for display
function formatPlanName(plan) {
    if (!plan) return 'BASIC';
    const planLower = plan.toLowerCase();
    if (planLower === 'pro+' || planLower === 'pro_plus' || planLower === 'proplus') {
        return 'PRO+';
    }
    if (planLower === 'pro') return 'PRO';
    return 'BASIC';
}

// Display error message
function displayError() {
    const container = document.getElementById('providersList');
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <p>Nastala chyba pri načítavaní poskytovateľov. Skúste to prosím znova.</p>
        </div>
    `;
}

// Setup event listeners for filters
function setupEventListeners() {
    const cityFilter = document.getElementById('cityFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');

    if (cityFilter) {
        cityFilter.addEventListener('change', (e) => {
            filters.city = e.target.value;
            loadProviders();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filters.category = e.target.value;
            loadProviders();
        });
    }

    if (searchInput) {
        // Debounce search input
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filters.search = e.target.value;
                loadProviders();
            }, 300);
        });
    }
}
