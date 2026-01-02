document.addEventListener('DOMContentLoaded', function () {
    // 1. Check Authentication
    const loggedInProviderId = localStorage.getItem('loggedInProviderId');

    if (!loggedInProviderId) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load Provider Data
    let provider = null;
    let uploadedPhotoData = null; // Store uploaded photo data

    // Check custom providers in localStorage
    try {
        const customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
        provider = customProviders.find(p => p.id === loggedInProviderId);
    } catch (e) {
        console.error('Error reading custom providers', e);
    }

    // 3. Pre-fill Form or Redirect if not found
    if (!provider) {
        alert('Chyba: Údaje o firme sa nenašli.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Pre-fill form fields
    document.getElementById('company-name').value = provider.name || '';
    document.getElementById('region').value = provider.region || '';
    document.getElementById('category').value = provider.category || provider.service_type || '';
    document.getElementById('service-description').value = provider.description || '';
    document.getElementById('phone').value = provider.phone || '';
    // Remove https:// prefix when loading for editing
    let websiteDisplay = provider.website || '';
    if (websiteDisplay.startsWith('https://')) {
        websiteDisplay = websiteDisplay.substring(8);
    } else if (websiteDisplay.startsWith('http://')) {
        websiteDisplay = websiteDisplay.substring(7);
    }
    document.getElementById('website').value = websiteDisplay;

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

    // 4. Handle File Upload
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

    // Gallery Management (Pro/Pro+ only)
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

    // 5. Handle Form Submission
    const editForm = document.getElementById('edit-profile-form');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Format website URL - add https:// if missing
            let websiteValue = document.getElementById('website').value.trim();
            if (websiteValue && !websiteValue.match(/^https?:\/\//i)) {
                websiteValue = 'https://' + websiteValue;
            }

            // Get form values - explicitly preserve critical fields
            const updatedProvider = {
                ...provider, // Keep ALL existing fields as base
                // Update editable fields
                name: document.getElementById('company-name').value.trim(),
                region: document.getElementById('region').value,
                category: document.getElementById('category').value,
                service_type: document.getElementById('category').value,
                description: document.getElementById('service-description').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                website: websiteValue,
                // Explicitly preserve critical fields that must NEVER change during profile edit
                plan: provider.plan, // CRITICAL: Never reset plan
                id: provider.id,
                email: provider.email
            };

            // Add uploaded photo data if available
            if (uploadedPhotoData) {
                updatedProvider.profilePhotoData = uploadedPhotoData;
            } else if (provider.profilePhotoData) {
                // Keep existing photo if no new one uploaded
                updatedProvider.profilePhotoData = provider.profilePhotoData;
            }

            // Add work photos
            updatedProvider.workPhotos = currentWorkPhotos;

            // Debug logging
            console.log('Saving provider profile:');
            console.log('- Plan:', updatedProvider.plan);
            console.log('- Description:', updatedProvider.description);
            console.log('- Website:', updatedProvider.website);
            console.log('- Full object:', updatedProvider);

            // Validate required fields
            if (!updatedProvider.name || !updatedProvider.region || !updatedProvider.category) {
                alert('Prosím, vyplňte všetky povinné polia (Názov firmy, Kraj, Kategória služby).');
                return;
            }

            // Validate description for Basic plan
            const currentPlan = (provider.plan || 'basic').toLowerCase();
            if (currentPlan === 'basic' && updatedProvider.description) {
                const phonePattern = /(\+?\d{1,4}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
                const urlPattern = /(https?:\/\/|www\.|\\.sk|\\.cz|\\.com|\\.eu|\\.org|\\.net)/gi;

                if (phonePattern.test(updatedProvider.description)) {
                    alert('Pre Basic plán nie je dovolené uvádzať telefónne číslo v popise firmy.');
                    return;
                }

                if (urlPattern.test(updatedProvider.description)) {
                    alert('Pre Basic plán nie je dovolené uvádzať webstránku v popise firmy.');
                    return;
                }
            }

            // Update provider in localStorage
            try {
                const customProviders = JSON.parse(localStorage.getItem('customProviders')) || [];
                const providerIndex = customProviders.findIndex(p => p.id === loggedInProviderId);

                if (providerIndex !== -1) {
                    customProviders[providerIndex] = updatedProvider;
                    localStorage.setItem('customProviders', JSON.stringify(customProviders));

                    console.log('Provider saved successfully to localStorage');
                    console.log('Redirecting to profile page...');

                    // Success - redirect to provider's public profile to see changes immediately
                    window.location.href = `provider-detail.html?id=${loggedInProviderId}`;
                } else {
                    alert('Chyba: Poskytovateľ nebol nájdený.');
                }
            } catch (e) {
                console.error('Error saving provider data', e);
                alert('Chyba pri ukladaní údajov. Skúste to prosím znova.');
            }
        });
    }

    // 6. Handle Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('loggedInProviderId');
            window.location.href = 'index.html';
        });
    }
});
