// Provider Registration Script - Backend Integrated (FIXED)
document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('register-form');

  // IMPORTANT: must be a STRING. If your config.js defines API_BASE_URL globally, this will use it.
  // If not defined, fallback to production:
  const BASE =
    (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) ||
    'https://stavbahub.onrender.com';

  let stripeConfig = null;

  // Try to fetch Stripe config (optional)
  try {
    const res = await fetch(`${BASE}/api/config`);
    const text = await res.text();

    // If backend returns HTML here, ignore gracefully
    if (text.trim().startsWith('<')) {
      stripeConfig = null;
    } else {
      stripeConfig = JSON.parse(text);
    }
  } catch (e) {
    console.warn('Stripe config not available (ok):', e);
    stripeConfig = null;
  }

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Clear previous errors/success
    document.querySelectorAll('.alert-error, .alert-success').forEach((el) => el.remove());

    const formData = new FormData(form);

    const data = {
      name: formData.get('company-name') || '',
      email: formData.get('email') || '',
      password: formData.get('password') || '',
      confirm_password: formData.get('confirm-password') || '',
      region: formData.get('region') || '',
      city: formData.get('city') || '',
      service_type: formData.get('category') || '',
      plan: (formData.get('plan') || '').toLowerCase(), // basic / pro / pro+
      description: formData.get('description') || '',
      phone: formData.get('phone') || ''
    };

    // Basic validation
    if (
      !data.name ||
      !data.email ||
      !data.password ||
      !data.region ||
      !data.city ||
      !data.service_type ||
      !data.plan
    ) {
      showError('Prosím, vyplňte všetky povinné polia.');
      return;
    }

    if (data.password !== data.confirm_password) {
      showError('Heslá sa nezhodujú.');
      return;
    }

    if (data.password.length < 6) {
      showError('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    // Handle Profile Photo (optional)
    const photoInput = document.getElementById('profile-photo');
    let profilePhotoData = null;

    if (photoInput && photoInput.files && photoInput.files[0]) {
      const file = photoInput.files[0];

      if (file.size > 5 * 1024 * 1024) {
        showError('Profilová fotka je príliš veľká. Maximálna veľkosť je 5MB.');
        return;
      }

      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        showError('Neplatný formát fotky. Použite JPG, PNG alebo WEBP.');
        return;
      }

      try {
        profilePhotoData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.error('Error reading photo:', err);
        showError('Chyba pri načítaní fotky.');
        return;
      }
    }

    try {
      const payload = {
        role: 'provider',
        name: data.name,
        email: data.email,
        password: data.password,

        // These fields depend on your backend. Keep them – backend can ignore unknown keys safely.
        region: data.region,
        city: data.city,
        service_type: data.service_type,
        plan: data.plan,
        description: data.description,
        phone: data.phone,
        profilePhotoData: profilePhotoData
      };

      const registerResponse = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Read as text first to avoid JSON crash if backend returns HTML
      const raw = await registerResponse.text();
      let registerResult = null;

      if (raw.trim().startsWith('<')) {
throw new Error('Server vrátil HTML namiesto JSON. Skontrolujte API endpoint.');
      } else {
        try {
          registerResult = JSON.parse(raw);
        } catch (err) {
          console.error('Bad JSON:', raw);
          throw new Error('Neplatná odpoveď zo servera (JSON).');
        }
      }

      if (!registerResponse.ok) {
        throw new Error(
          registerResult?.error ||
          registerResult?.message ||
          'Registrácia zlyhala.'
        );
      }

      // ✅ UNIVERSAL ID extraction (Mongo uses _id)
      const providerId =
        registerResult?.provider?._id ||
        registerResult?.provider?.id ||
        registerResult?.user?._id ||
        registerResult?.user?.id ||
        registerResult?._id ||
        registerResult?.id ||
        null;

      if (!providerId) {
        console.error('Register response:', registerResult);
        throw new Error('Registrácia prebehla, ale server nevrátil ID používateľa.');
      }

      // Save token if exists
      if (registerResult?.token) {
        localStorage.setItem('token', registerResult.token);
      }

      // Save provider session
      localStorage.setItem('loggedInProviderId', providerId);
      localStorage.setItem('loggedInProvider', JSON.stringify(registerResult?.provider  registerResult?.user  {}));

      // Plan handling
      if (data.plan === 'basic') {
        showSuccess('Registrácia bola úspešná! Presmerovávame vás...');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      } else {
        await redirectToStripeCheckout(providerId, data.plan);
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError(error.message || 'Registrácia zlyhala. Skúste to znova.');
    }
  });

  async function redirectToStripeCheckout(providerId, plan) {
    // If no config endpoint, block gracefully (so Pro doesn’t crash)
    if (!stripeConfig || !stripeConfig.prices) {
      showError('Platobná konfigurácia nie je dostupná. Skúste plán Basic alebo nastavte Stripe backend.');
      return;
    }

    const priceId = stripeConfig.prices[plan];
    if (!priceId) {
      showError('Neplatný plán.');
      return;
    }

    showSuccess('Presmerovávame vás na platobnú bránu...');

    try {
      const response = await fetch(`${BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, providerId })
      });

      const raw = await response.text();
      let data = null;

      if (raw.trim().startsWith('<')) {
        throw new Error('Server vrátil HTML namiesto JSON pri platbe.');
      } else {
        data = JSON.parse(raw);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        showError('Chyba pri vytváraní platby: ' + (data.error || 'Neznáma chyba'));
      }
    } catch (e) {
      console.error(e);
      showError('Chyba pri komunikácii so serverom.');
    }
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.style.marginBottom = '1rem';
    errorDiv.textContent = message;

    const formCard = document.querySelector('.card') || form;
    const title = formCard.querySelector('h1') || formCard;
    title.insertAdjacentElement('afterend', errorDiv);
  }

  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.style.marginBottom = '1rem';
    successDiv.textContent = message;

    const formCard = document.querySelector('.card') || form;
    const title = formCard.querySelector('h1') || formCard;
    title.insertAdjacentElement('afterend', successDiv);
  }
});