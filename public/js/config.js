// API Base URL Configuration
// Automatically detects production vs local development
const API_BASE_URL =
    window.location.hostname.includes('onrender.com') ||
        window.location.hostname.includes('stavbahub.sk')
        ? window.location.origin
        : 'http://localhost:4000';
