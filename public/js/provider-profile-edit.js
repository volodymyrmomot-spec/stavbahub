document.addEventListener('DOMContentLoaded', async function () {
    // ===================================================================
    // JWT AUTHENTICATION - Check token first
    // ===================================================================
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Relácia vypršala. Prihláste sa znova.');
        window.location.href = 'login.html';
        return;
    }

    // ===================================================================
    // LOAD PROVIDER DATA FROM API
    // ===================================================================
    let provider = null;
    let uploadedPhotoData = null; // Store uploaded photo data

    try {
        const response = await fetch(`/api/providers/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Handle 401/403 - token invalid/expired
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            alert('Relácia vypršala. Prihláste sa znova.');
            window.location.href = 'login.html';
            return;
        }

        // Handle other errors
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            alert('Chyba pri načítaní údajov. Skúste to znova.');
            return;
        }

        provider = await response.json();
        console.log('Provider data loaded:', provider);

    } catch (error) {
        console.error('Error loading provider data:', error);
        alert('Chyba pri načítaní údajov. Skontrolujte pripojenie.');
        return;
    }

    // Get user data for email (Provider model doesn't have email)
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // ===================================================================
    // PRE-FILL FORM
    // ===================================================================
    document.getElementById('company-name').value = provider.name || '';

    // Provider model uses 'categories' array, form expects single category
    const category = provider.categories && provider.categories.length > 0
        ? provider.categories[0]
        : '';
    document.getElementById('category').value = category;

    document.getElementById('service-description').value = provider.description || '';

    // Note: Provider model doesn't have region, phone, website fields
    // These fields won't be pre-filled or saved unless backend model is updated
    const regionField = document.getElementById('region');
    if (regionField) regionField.value = provider.region || '';

    const phoneField = document.getElementById('phone');
    if (phoneField) phoneField.value = provider.phone || '';

    const websiteField = document.getElementById('website');
    if (websiteField) {
        let websiteDisplay = provider.website || '';
        if (websiteDisplay.startsWith('https://')) {
            websiteDisplay = websiteDisplay.substring(8);
        } else if (websiteDisplay.startsWith('http://')) {
            websiteDisplay = websiteDisplay.substring(7);
        }
        websiteField.value = websiteDisplay;
    }

    // Show existing photo if available
    const photoPreview = document.getElementById('photo-preview');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    if (provider.profilePhotoData || provider.profilePhotoUrl) {
        const photoSrc = provider.profilePhotoData || provider.profilePhotoUrl;
        if (photoPreviewImg) {
            photoPreviewImg.src = photoSrc;
            photoPreview.style.display = 'block';
        }
    }

    // Display current plan (read-only)
    const planDisplay = document.getElementById('current-plan-display');
    if (planDisplay) {
        const planText = provider.plan || 'basic';
        if (planText.toLowerCase() === 'pro+' || planText.toLowerCase() === 'proplus') {
            planDisplay.textContent = 'Pro+';
        } else if (planText.toLowerCase() === 'pro') {
            planDisplay.textContent = 'Pro';
        } else {
            planDisplay.textContent = 'Basic';
        }
    }

    // ===================================================================
    // HANDLE FILE UPLOAD
    // ===================================================================
    const fileInput = document.getElementById('profile-photo-file');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Súbor je príliš veľký. Maximálna veľkosť je 5MB.');
                    fileInput.value = '';
                    return;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Prosím, vyberte obrázok (JPG, PNG, GIF).');
                    fileInput.value = '';
                    return;
                }

                // Read file as base64
                const reader = new FileReader();
                reader.onload = function (event) {
                    uploadedPhotoData = event.target.result;
                    // Show preview
                    if (photoPreviewImg) {
                        photoPreviewImg.src = uploadedPhotoData;
                        photoPreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ===================================================================
    // GALLERY MANAGEMENT (Pro/Pro+ only)
    // ===================================================================
    let currentWorkPhotos = provider.workPhotos || [];
    const plan = (provider.plan || 'basic').toLowerCase();
    const gallerySection = document.getElementById('gallery-upload-section');
    const basicMessage = document.getElementById('gallery-basic-message');
    const maxPhotos = plan === 'pro' ? 3 : (plan === 'pro+' || plan === 'proplus' ? 30 : 0);

    if (plan === 'pro' || plan === 'pro+' || plan === 'proplus') {
        // Show gallery section
        if (gallerySection) {
            gallerySection.style.display = 'block';
            const maxPhotosDisplay = document.getElementById('max-photos-display');
            if (maxPhotosDisplay) {
                maxPhotosDisplay.textContent = maxPhotos;
            }
        }

        // Load current gallery
        function loadGalleryThumbnails() {
            const galleryContainer = document.getElementById('current-photos-grid');
            if (!galleryContainer) return;

            galleryContainer.innerHTML = '';

            currentWorkPhotos.forEach((photoData, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.style.cssText = 'position: relative; display: inline-block; margin: 0.5rem;';
                item.innerHTML = `
                    <img src="${photoData}" alt="Work photo ${index + 1}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;">
                    <button type="button" class="gallery-item-delete" data-index="${index}" title="Odstrániť" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">&times;</button>
                `;
                galleryContainer.appendChild(item);
            });

            // Add delete event listeners
            document.querySelectorAll('.gallery-item-delete').forEach(btn => {
                btn.addEventListener('click', function () {
                    const index = parseInt(this.getAttribute('data-index'));
                    currentWorkPhotos.splice(index, 1);
                    loadGalleryThumbnails();
                });
            });
        }

        loadGalleryThumbnails();

        // Handle gallery file upload
        const workPhotosInput = document.getElementById('photo-upload');
        const galleryError = document.getElementById('upload-error');

        if (workPhotosInput) {
            workPhotosInput.addEventListener('change', function (e) {
                const files = Array.from(e.target.files);
                if (galleryError) {
                    galleryError.style.display = 'none';
                    galleryError.textContent = '';
                }

                if (files.length === 0) return;

                // Check total count
                if (currentWorkPhotos.length + files.length > maxPhotos) {
                    if (galleryError) {
                        galleryError.textContent = `Môžete nahrať max. ${maxPhotos} fotiek. Už máte ${currentWorkPhotos.length}.`;
                        galleryError.style.display = 'block';
                    }
                    workPhotosInput.value = '';
                    return;
                }

                let validFiles = [];
                let errors = [];

                files.forEach(file => {
                    // Validate file type
                    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
                        errors.push(`${file.name}: Neplatný formát. Použite JPG, PNG alebo WEBP.`);
                        return;
                    }

                    // Validate file size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        errors.push(`${file.name}: Súbor je príliš veľký (max 5MB).`);
                        return;
                    }

                    validFiles.push(file);
                });

                if (errors.length > 0 && galleryError) {
                    galleryError.textContent = errors.join(' ');
                    galleryError.style.display = 'block';
                }

                // Process valid files
                if (validFiles.length > 0) {
                    let processed = 0;
                    validFiles.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = function (event) {
                            currentWorkPhotos.push(event.target.result);
                            processed++;
                            if (processed === validFiles.length) {
                                loadGalleryThumbnails();
                                workPhotosInput.value = '';
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                }
            });
        }
    } else {
        // Show Basic plan message
        if (basicMessage) {
            basicMessage.style.display = 'block';
        }
    }

    // ===================================================================
    // HANDLE FORM SUBMISSION - UPDATE VIA API
    // ===================================================================
    const editForm = document.getElementById('edit-profile-form');
    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = editForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Ukladám...';
            }

            try {
                // Build update payload matching Provider model
                const updateData = {
                    name: document.getElementById('company-name').value.trim(),
                    categories: [document.getElementById('category').value],
                    city: document.getElementById('region').value, // wait, form has region but maybe mapped to city? Let's check edit-profile.html. Input id='region' is select. 
                    // Actually provider model has BOTH city and region.
                    // edit-profile.html has id="region" (select) but NO id="city"?
                    // Let's re-read edit-profile.html content from Step 161.
                    // It has <select name="region" id="region">.
                    // It does NOT have a city input? 
                    // register-firm.html has BOTH city and region.
                    // if edit-profile.html lacks city, we might lose data if we don't send it or if we send undefined.
                    // We should preserve existing city if not editable.
                    // Or maybe region select is actually serving as city/location?
                    // Let's assume region is region. And city is missing from edit form?? 
                    // User requirement: "Save companyName, category, region, phone, description". City wasn't explicitly mentioned in "Save...", but it is required in Model.
                    // If I send PUT (upsert), I MUST send required fields.
                    // If I don't have city in form, I must use existing city from `provider` object loaded earlier.

                    region: document.getElementById('region').value,
                    city: provider.city || '', // Keep existing city
                    description: document.getElementById('service-description').value.trim(),
                    phone: document.getElementById('phone').value.trim(),
                    website: document.getElementById('website').value.trim(),
                    active: true,
                    // Plan is read-only usually, but maybe we send it to keep it?
                    plan: provider.plan
                };

                console.log('Updating provider profile:', updateData);

                // Make API call to update provider
                const response = await fetch(`/api/providers/me`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                // Handle 401/403 - token invalid/expired
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    alert('Relácia vypršala. Prihláste sa znova.');
                    window.location.href = 'login.html';
                    return;
                }

                // Handle other errors
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    console.error('Update failed:', errorData);
                    alert(`Chyba pri ukladaní: ${errorData.message || 'Neznáma chyba'}`);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                    return;
                }

                const updatedProvider = await response.json();
                console.log('Provider updated successfully:', updatedProvider);

                alert('Profil bol úspešne aktualizovaný!');

                // Redirect to dashboard
                window.location.href = 'provider-dashboard.html';

            } catch (error) {
                console.error('Error updating provider:', error);
                alert('Chyba pri ukladaní údajov. Skontrolujte pripojenie.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // ===================================================================
    // HANDLE LOGOUT BUTTON
    // ===================================================================
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});
