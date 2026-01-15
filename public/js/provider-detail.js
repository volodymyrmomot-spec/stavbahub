// Provider Detail Page Logic
document.addEventListener('DOMContentLoaded', function () {
    // Load provider details from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const providerId = urlParams.get('id');

    if (!providerId) {
        showError('Nebol zadaný ID poskytovateľa.');
        return;
    }

    console.log('Loading provider with ID:', providerId);

    // Fetch provider from API
    fetch(`/api/providers/${providerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Provider not found');
            }
            return response.json();
        })
        .then(provider => {
            console.log('Provider loaded:', provider);
            loadProviderData(provider);
        })
        .catch(error => {
            console.error('Error loading provider:', error);
            showError('Poskytovateľ s týmto ID neexistuje.');
        });
});

function loadProviderData(provider) {
    // Update profile photo
    const photoElement = document.getElementById('provider-photo');
    const photoPlaceholder = document.getElementById('provider-photo-placeholder');

    if (provider.profilePhotoData || provider.profilePhotoUrl) {
        photoElement.src = provider.profilePhotoData || provider.profilePhotoUrl;
        photoElement.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    } else {
        photoElement.style.display = 'none';
        photoPlaceholder.style.display = 'flex';
    }

    // Update provider name
    document.getElementById('provider-name').textContent = provider.name || 'Bez názvu';

    // Update category and region
    const categoryText = provider.service_type || provider.category || '';
    document.getElementById('provider-category').textContent = categoryText;
    document.getElementById('provider-region').textContent = provider.region || '';

    // Update description
    document.getElementById('provider-description').textContent = provider.description || 'Žiadny popis';

    // Get plan for visibility rules
    const plan = (provider.plan || 'basic').toLowerCase();

    // Update plan badge
    const planBadge = document.getElementById('provider-plan-badge');

    // Set badge text and class
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

    // Handle phone based on plan
    const phoneElement = document.getElementById('provider-phone');
    if (plan === 'basic') {
        phoneElement.textContent = 'Dostupné len v PRO profile';
        phoneElement.style.fontSize = '0.875rem';
        phoneElement.style.color = 'var(--text-gray)';
    } else {
        phoneElement.textContent = provider.phone || '-';
        phoneElement.style.fontSize = '1.5rem';
        phoneElement.style.color = '';
    }

    // Handle website based on plan
    const websiteElement = document.getElementById('provider-website');
    if (plan === 'basic') {
        websiteElement.textContent = 'Dostupné len v PRO profile';
        websiteElement.style.fontSize = '0.875rem';
        websiteElement.style.color = 'var(--text-gray)';
    } else {
        if (provider.website && provider.website.trim() !== '') {
            let websiteUrl = provider.website.trim();
            // Add https:// if no protocol specified
            if (!websiteUrl.match(/^https?:\/\//i)) {
                websiteUrl = 'https://' + websiteUrl;
            }
            // Create clickable link
            websiteElement.innerHTML = `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary-blue); text-decoration: none; word-break: break-all;">${provider.website}</a>`;
            websiteElement.style.fontSize = '1rem';
            websiteElement.style.color = '';
        } else {
            websiteElement.textContent = '–';
            websiteElement.style.fontSize = '1rem';
            websiteElement.style.color = '';
        }
    }

    // Handle rating based on plan
    const ratingCard = document.querySelector('.grid-3 .card:first-child');
    if (plan === 'basic') {
        // Hide rating card for Basic plan
        if (ratingCard) {
            ratingCard.style.display = 'none';
        }
    } else {
        // Show rating for Pro/Pro+
        if (ratingCard) {
            ratingCard.style.display = '';
        }
        const rating = provider.rating || 5.0;
        const ratingElement = document.getElementById('provider-rating');
        if (ratingElement) {
            ratingElement.textContent = rating.toFixed(1);
        }
    }

    // Handle photos based on plan
    handlePhotos(provider, plan);

    // Handle reviews based on plan
    handleReviews(provider, plan);

    // Make providerId globally available for chat button (use _id or id)
    window.providerId = provider._id || provider.id;
}

function handlePhotos(provider, plan) {
    const photosSection = document.getElementById('photos-section');
    const photosGallery = document.getElementById('photos-gallery');
    const noPhotosMessage = document.getElementById('no-photos-message');

    if (plan === 'basic') {
        photosSection.style.display = 'none';
    } else {
        // Pro or Pro+
        photosSection.style.display = 'block';

        // Use workPhotos array which contains the actual gallery images
        const workPhotos = provider.workPhotos || [];

        // Determine max photos based on plan
        const maxPhotos = plan === 'pro' ? 3 : 30;
        const photosToShow = workPhotos.slice(0, maxPhotos);

        if (photosToShow.length > 0) {
            photosGallery.innerHTML = '';
            noPhotosMessage.style.display = 'none';

            photosToShow.forEach((photo, index) => {
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                // Add click handler to open image in new tab
                photoItem.style.cursor = 'pointer';
                photoItem.onclick = () => window.open(photo, '_blank');
                photoItem.innerHTML = `<img src="${photo}" alt="Realizácia ${index + 1}" loading="lazy">`;
                photosGallery.appendChild(photoItem);
            });
        } else {
            photosGallery.innerHTML = '';
            noPhotosMessage.style.display = 'block';
        }
    }
}

function handleReviews(provider, plan) {
    if (provider.reviews && provider.reviews.length > 0) {
        if (plan === 'basic') {
            // Basic plan: no reviews
            console.log('Basic plan - no reviews shown');
        } else {
            // Pro and Pro+ plans: show all reviews
            const reviewsSection = document.getElementById('reviews-section');
            const reviewsList = document.getElementById('reviews-list');

            reviewsSection.style.display = 'block';

            provider.reviews.forEach(review => {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';

                const stars = '⭐'.repeat(review.rating);

                reviewItem.innerHTML = `
                    <div class="review-header">
                        <span class="review-author">${review.name}</span>
                        <span class="review-stars">${stars}</span>
                    </div>
                    <p class="review-text">${review.text}</p>
                `;

                reviewsList.appendChild(reviewItem);
            });

            console.log('Showing', provider.reviews.length, 'reviews');
        }
    }
}

function showError(message) {
    document.getElementById('provider-name').textContent = 'Chyba';
    document.getElementById('provider-description').textContent = message;
    console.error(message);
}

// Messaging functions
function startChat(providerId) {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Musíte byť prihlásený, aby ste mohli poslať správu. Prosím, prihláste sa.');
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        alert('Chyba pri načítaní údajov používateľa. Prosím, prihláste sa znova.');
        window.location.href = 'login.html';
        return;
    }

    // Check if user is a customer
    if (user.role !== 'customer') {
        alert('Len zákazníci môžu posielať správy poskytovateľom.');
        return;
    }

    // Store providerId for sending message
    window.currentProviderId = providerId;

    // Open message modal
    openMessageModal();
}

function openMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.style.display = 'flex';
    document.getElementById('message-text').value = '';
    document.getElementById('message-feedback').style.display = 'none';
}

function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.style.display = 'none';
    document.getElementById('message-text').value = '';
    document.getElementById('message-feedback').style.display = 'none';
}

// Handle message form submission
document.addEventListener('DOMContentLoaded', function () {
    const messageForm = document.getElementById('message-form');

    if (messageForm) {
        messageForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const text = document.getElementById('message-text').value.trim();
            const providerId = window.currentProviderId;
            const token = localStorage.getItem('token');

            if (!text) {
                showMessageFeedback('Prosím, napíšte správu.', 'error');
                return;
            }

            if (!providerId) {
                showMessageFeedback('Chyba: ID poskytovateľa nebolo nájdené.', 'error');
                return;
            }

            // Disable submit button
            const submitBtn = messageForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Odosielam...';

            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        providerId: providerId,
                        text: text
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Nepodarilo sa odoslať správu.');
                }

                // Success
                showMessageFeedback('Správa bola úspešne odoslaná!', 'success');
                document.getElementById('message-text').value = '';

                // Close modal after 2 seconds
                setTimeout(() => {
                    closeMessageModal();
                }, 2000);

            } catch (error) {
                console.error('Error sending message:', error);
                showMessageFeedback(error.message || 'Chyba pri odosielaní správy.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

function showMessageFeedback(message, type) {
    const feedback = document.getElementById('message-feedback');
    feedback.textContent = message;
    feedback.style.display = 'block';
    feedback.style.padding = '0.75rem';
    feedback.style.borderRadius = '6px';
    feedback.style.marginTop = '1rem';

    if (type === 'success') {
        feedback.style.background = '#d1fae5';
        feedback.style.color = '#065f46';
        feedback.style.border = '1px solid #10b981';
    } else {
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.border = '1px solid #ef4444';
    }
}
