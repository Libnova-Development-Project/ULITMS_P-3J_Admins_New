// ============================================================
// ULITMS API Service Layer
// ============================================================

const API_BASE_URL = 'http://localhost:5000/api';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('ulitms_token');
}

// API request handler
async function apiRequest(endpoint, options = {}) {
    try {
        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = Bearer ;
        }
        
        const response = await fetch(${API_BASE_URL}, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '/login.html';
            }
            throw new Error(data.message || data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
window.login = async function(identifier, password, role) {
    const response = await fetch(${API_BASE_URL}/auth/login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || data.error || 'Login failed');
    }
    
    // Store user data
    localStorage.setItem('ulitms_token', data.token || data.data?.token);
    localStorage.setItem('ulitms_role', data.user?.role || data.data?.user?.role);
    localStorage.setItem('ulitms_name', data.user?.name || data.data?.user?.name || 'User');
    localStorage.setItem('ulitms_email', data.user?.email || data.data?.user?.email);
    localStorage.setItem('ulitms_studentid', data.user?.student_id || data.data?.user?.student_id || '');
    localStorage.setItem('ulitms_user_id', data.user?.id || data.data?.user?.id);
    
    return data;
};

window.register = async function(userData) {
    const response = await fetch(${API_BASE_URL}/auth/register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
    }
    
    return data;
};

window.logout = function() {
    localStorage.clear();
    window.location.href = '/login.html';
};

// Books API
window.fetchBooks = async function(filters = {}) {
    const params = new URLSearchParams(filters);
    return apiRequest(/books?);
};

window.createBook = async function(bookData) {
    return apiRequest('/books', {
        method: 'POST',
        body: JSON.stringify(bookData)
    });
};

window.updateBook = async function(id, bookData) {
    return apiRequest(/books/, {
        method: 'PUT',
        body: JSON.stringify(bookData)
    });
};

window.deleteBook = async function(id) {
    return apiRequest(/books/, { method: 'DELETE' });
};

// Borrowings API
window.fetchMyBorrowings = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    return apiRequest(/borrowings/user/);
};

window.borrowBook = async function(bookId, userId, dueDate) {
    return apiRequest('/borrowings', {
        method: 'POST',
        body: JSON.stringify({ book_id: bookId, user_id: userId, due_date: dueDate })
    });
};

window.returnBook = async function(borrowingId) {
    return apiRequest(/borrowings//return, { method: 'PUT' });
};

// Users API
window.fetchUserProfile = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    return apiRequest(/users/profile/);
};

window.fetchAllUsers = async function() {
    return apiRequest('/users');
};

window.deleteUser = async function(userId) {
    return apiRequest(/users/, { method: 'DELETE' });
};

window.changePassword = async function(userId, currentPassword, newPassword) {
    return apiRequest(/users//password, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });
};

// E-Library API
window.fetchUserSessions = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    return apiRequest(/elibrary/sessions/user/);
};

window.startSession = async function(unitId, purpose) {
    return apiRequest('/elibrary/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ unit_id: unitId, purpose })
    });
};

window.endSession = async function(sessionId) {
    return apiRequest(/elibrary/sessions//end, { method: 'PUT' });
};

// Peripherals API
window.fetchPeripherals = async function() {
    return apiRequest('/peripherals');
};

// Damage Reports API
window.fetchDamageReports = async function() {
    return apiRequest('/damage-reports');
};

window.createDamageReport = async function(reportData) {
    return apiRequest('/damage-reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
    });
};

console.log('✅ API Service Loaded - Using:', API_BASE_URL);
