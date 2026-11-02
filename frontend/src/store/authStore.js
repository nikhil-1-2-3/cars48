import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('userInfo')) || null,
    requiresOTP: false,
    otpEmail: null,
    devOTP: null,
    emailPreviewUrl: null,
    isLoading: false,
    error: null,

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/login', { email, password });
            if (data.requiresOTP) {
                if (data.devOTP) console.log(`%c 🔐 DEVELOPMENT OTP: ${data.devOTP} `, 'background: #222; color: #bada55; font-size: 16px;');
                set({ requiresOTP: true, otpEmail: data.email, devOTP: data.devOTP, emailPreviewUrl: data.emailPreviewUrl, isLoading: false });
            } else {
                localStorage.setItem('userInfo', JSON.stringify(data));
                set({ user: data, isLoading: false, requiresOTP: false, otpEmail: null, devOTP: null, emailPreviewUrl: null });
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/register', userData);
            if (data.requiresOTP) {
                if (data.devOTP) console.log(`%c 🔐 DEVELOPMENT OTP: ${data.devOTP} `, 'background: #222; color: #bada55; font-size: 16px;');
                set({ requiresOTP: true, otpEmail: data.email, devOTP: data.devOTP, emailPreviewUrl: data.emailPreviewUrl, isLoading: false });
            } else {
                localStorage.setItem('userInfo', JSON.stringify(data));
                set({ user: data, isLoading: false, requiresOTP: false, otpEmail: null, devOTP: null, emailPreviewUrl: null });
            }
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    verifyOTP: async (email, otp) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            localStorage.setItem('userInfo', JSON.stringify(data));
            set({ user: data, isLoading: false, requiresOTP: false, otpEmail: null });
            return true;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            return false;
        }
    },

    googleLogin: async (tokenId) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/google', { tokenId });
            localStorage.setItem('userInfo', JSON.stringify(data));
            set({ user: data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    updateProfile: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.put('/auth/profile', userData);
            set((state) => {
                const updatedUser = { ...state.user, ...data };
                localStorage.setItem('userInfo', JSON.stringify(updatedUser));
                return { user: updatedUser, isLoading: false };
            });
            return { success: true };
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            set({ error: errorMsg, isLoading: false });
            return { success: false, error: errorMsg };
        }
    },

    requestPasswordChange: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.post('/auth/profile/request-password-change');
            if (data.devOTP) console.log(`%c 🔐 DEVELOPMENT OTP: ${data.devOTP} `, 'background: #222; color: #bada55; font-size: 16px;');
            set({ isLoading: false, devOTP: data.devOTP });
            return { success: true, message: data.message, devOTP: data.devOTP };
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            set({ error: errorMsg, isLoading: false });
            return { success: false, error: errorMsg };
        }
    },

    verifyPasswordChange: async (otp, newPassword) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.put('/auth/profile/password', { otp, newPassword });
            set({ isLoading: false });
            return { success: true, message: data.message };
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            set({ error: errorMsg, isLoading: false });
            return { success: false, error: errorMsg };
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
            localStorage.removeItem('userInfo');
            set({ user: null });
        } catch (error) {
            console.error('Logout error', error);
        }
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
