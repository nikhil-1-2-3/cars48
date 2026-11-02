import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
