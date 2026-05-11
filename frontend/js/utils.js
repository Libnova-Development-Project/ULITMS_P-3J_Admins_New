/**
 * ULITMS - Frontend Utilities
 * Organized JavaScript utilities for modern frontend
 */

// ========== API CONFIGURATION ==========

const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    TIMEOUT: 10000
};

const AUTH_TOKEN_KEY = 'ulitms_token';
const AUTH_ROLE_KEY = 'ulitms_role';
const AUTH_USER_KEY = 'ulitms_user';

// ========== STORAGE HELPERS ==========

const Storage = {
    getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
    getRole: () => localStorage.getItem(AUTH_ROLE_KEY),
    getUser: () => JSON.parse(localStorage.getItem(AUTH_USER_KEY) || '{}'),
    
    setAuth: (token, role, user) => {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_ROLE_KEY, role);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },
    
    clearAuth: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_ROLE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    },
    
    isAuthenticated: () => !!localStorage.getItem(AUTH_TOKEN_KEY)
};

// ========== API HELPERS ==========

const API = {
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const token = Storage.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers,
                timeout: API_CONFIG.TIMEOUT
            });
            
            if (response.status === 401) {
                Storage.clearAuth();
                window.location.href = '/login-modern.html';
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            return null;
        }
    },
    
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ========== UI HELPERS ==========

const UI = {
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },
    
    showLoader(element = null) {
        const html = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        if (element) {
            element.innerHTML = html;
        }
        return html;
    },
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
};

// ========== VALIDATION HELPERS ==========

const Validation = {
    isEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    isStrongPassword(password) {
        return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
    },
    
    isPhoneNumber(phone) {
        return /^(\+63|0)[0-9]{10}$/.test(phone);
    },
    
    isStudentId(id) {
        return /^[0-9]{4}-[0-9]{5}$/.test(id);
    }
};

// ========== STATE MANAGEMENT ==========

const State = {
    currentUser: Storage.getUser(),
    currentRole: Storage.getRole(),
    notifications: [],
    
    setUser(user) {
        this.currentUser = user;
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    },
    
    addNotification(notification) {
        this.notifications.push({
            id: Date.now(),
            timestamp: new Date(),
            ...notification
        });
    },
    
    clearNotifications() {
        this.notifications = [];
    }
};

// ========== EXPORT ==========

window.API = API;
window.Storage = Storage;
window.UI = UI;
window.Validation = Validation;
window.State = State;
