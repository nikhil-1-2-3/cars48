import axios from 'axios';

// If the app is loaded over HTTPS, prevent insecure HTTP calls by routing through /api rewrite
const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl?.startsWith('http://')) {
        return '/api';
    }
    return envUrl || '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true, // Important for sending/receiving cookies (JWT)
});

// Request interceptor to attach Bearer token if available
api.interceptors.request.use((config) => {
    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo?.token) {
            config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
    } catch {
        // ignore JSON parse error
    }
    return config;
});

// Response interceptor for generic error handling and 401 cache clearing
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('userInfo');
        }
        const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
        return Promise.reject(new Error(message));
    }
);

export default api;
