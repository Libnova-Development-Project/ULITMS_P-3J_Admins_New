// API Configuration for Node.js Backend
const API_BASE_URL = window.location.origin + '/api';

// Token Management
let authToken = localStorage.getItem('ulitms_token');

// Set token
function setToken(token) {
    localStorage.setItem('ulitms_token', token);
    authToken = token;
}

// Get token
function getToken() {
    return localStorage.getItem('ulitms_token');
}

// Remove token
function removeToken() {
    localStorage.removeItem('ulitms_token');
    authToken = null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!authToken;
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...config,
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Books API
const booksAPI = {
    async getBooks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/books?${queryString}`);
    },
    async getBook(id) {
        return await apiRequest(`/books/${id}`);
    },
    async createBook(bookData) {
        return await apiRequest('/books', {
            method: 'POST',
            body: JSON.stringify(bookData)
        });
    },
    async updateBook(id, bookData) {
        return await apiRequest(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(bookData)
        });
    },
    async deleteBook(id) {
        return await apiRequest(`/books/${id}`, {
            method: 'DELETE'
        });
    },
    async getCategories() {
        return await apiRequest('/book-categories');
    }
};

// Users API
const usersAPI = {
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/users?${queryString}`);
    },
    async getUser(id) {
        return await apiRequest(`/users/${id}`);
    },
    async createUser(userData) {
        return await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    async updateUser(id, userData) {
        return await apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },
    async deleteUser(id) {
        return await apiRequest(`/users/${id}`, {
            method: 'DELETE'
        });
    },
    async toggleUserStatus(id, isActive) {
        return await apiRequest(`/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: isActive })
        });
    }
};

// Authentication API
const authAPI = {
    async login(credentials) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        if (data.success) {
            setToken(data.token);
            localStorage.setItem('ulitms_user', JSON.stringify(data.user));
        }
        return data;
    },
    async logout() {
        try {
            await apiRequest('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        removeToken();
        localStorage.removeItem('ulitms_user');
    },
    getCurrentUser() {
        const userStr = localStorage.getItem('ulitms_user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// E-Library API
const elibraryAPI = {
    async getUnits(activeOnly = true) {
        return await apiRequest(`/elibrary/units?activeOnly=${activeOnly}`);
    },
    async getUnit(id) {
        return await apiRequest(`/elibrary/units/${id}`);
    },
    async createUnit(unitData) {
        return await apiRequest('/elibrary/units', {
            method: 'POST',
            body: JSON.stringify(unitData)
        });
    },
    async updateUnit(id, unitData) {
        return await apiRequest(`/elibrary/units/${id}`, {
            method: 'PUT',
            body: JSON.stringify(unitData)
        });
    },
    async deleteUnit(id) {
        return await apiRequest(`/elibrary/units/${id}`, {
            method: 'DELETE'
        });
    },
    async startSession(unitId, purpose = null) {
        return await apiRequest('/elibrary/sessions/start', {
            method: 'POST',
            body: JSON.stringify({ unit_id: unitId, purpose })
        });
    },
    async endSession(sessionId) {
        return await apiRequest(`/elibrary/sessions/${sessionId}/end`, {
            method: 'PUT'
        });
    },
    async getAllSessions(limit = 100, offset = 0, activeOnly = false) {
        return await apiRequest(`/elibrary/sessions?limit=${limit}&offset=${offset}&activeOnly=${activeOnly}`);
    },
    async getActiveSessions() {
        return await apiRequest('/elibrary/sessions/active');
    },
    async getUserSessions(userId) {
        return await apiRequest(`/elibrary/sessions/user/${userId}`);
    }
};

// Peripherals API
const peripheralsAPI = {
    async getPeripherals(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/peripherals?${queryString}`);
    },
    async getPeripheral(id) {
        return await apiRequest(`/peripherals/${id}`);
    },
    async createPeripheral(data) {
        return await apiRequest('/peripherals', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    async updatePeripheral(id, data) {
        return await apiRequest(`/peripherals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    async deletePeripheral(id) {
        return await apiRequest(`/peripherals/${id}`, {
            method: 'DELETE'
        });
    },
    async getCategories() {
        return await apiRequest('/peripherals/categories');
    },
    async createCategory(data) {
        return await apiRequest('/peripherals/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// Utility Functions
const utils = {
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    },
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        booksAPI, usersAPI, authAPI, elibraryAPI, peripheralsAPI,
        utils, setToken, getToken, removeToken, isAuthenticated
    };
} else {
    window.booksAPI = booksAPI;
    window.usersAPI = usersAPI;
    window.authAPI = authAPI;
    window.elibraryAPI = elibraryAPI;
    window.peripheralsAPI = peripheralsAPI;
    window.utils = utils;
}
