// ============================================================
// ULITMS API Service Layer - COMPLETE FIXED VERSION
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
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                if (window.location.pathname !== '/login.html') {
                    window.location.href = '/login.html';
                }
            }
            throw new Error(data.message || data.error || 'Request failed');
        }
        
        // Return the data object directly (not the wrapper)
        return data.data || data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================================
// AUTH API
// ============================================================

window.login = async function(identifier, password, role) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Login failed');
    }
    
    // Store user data - handle both response formats
    const token = data.token || data.data?.token;
    const user = data.user || data.data?.user;
    
    if (token && user) {
        localStorage.setItem('ulitms_token', token);
        localStorage.setItem('ulitms_role', user.role);
        localStorage.setItem('ulitms_name', `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User');
        localStorage.setItem('ulitms_email', user.email);
        localStorage.setItem('ulitms_studentid', user.student_id || '');
        localStorage.setItem('ulitms_user_id', user.id);
    }
    
    return data;
};

window.register = async function(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
    }
    
    return data;
};

window.logout = function() {
    localStorage.clear();
    window.location.href = '/login.html';
};

// ============================================================
// BOOKS API
// ============================================================

window.fetchBooks = async function(filters = {}) {
    const params = new URLSearchParams(filters);
    const result = await apiRequest(`/books?${params}`);
    return result;
};

window.fetchBookById = async function(id) {
    const result = await apiRequest(`/books/${id}`);
    return result.book || result;
};

window.createBook = async function(bookData) {
    const result = await apiRequest('/books', {
        method: 'POST',
        body: JSON.stringify(bookData)
    });
    return result.book || result;
};

window.updateBook = async function(id, bookData) {
    const result = await apiRequest(`/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bookData)
    });
    return result.book || result;
};

window.deleteBook = async function(id) {
    return apiRequest(`/books/${id}`, { method: 'DELETE' });
};

window.searchBooks = async function(query) {
    const result = await apiRequest(`/books/search?query=${encodeURIComponent(query)}`);
    return result;
};

window.fetchBookCategories = async function() {
    const result = await apiRequest('/books/categories');
    return result.categories || result;
};

// ============================================================
// BORROWINGS API
// ============================================================

window.fetchMyBorrowings = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    if (!userId) throw new Error('User not logged in');
    const result = await apiRequest(`/borrowings/user/${userId}`);
    return result.borrowings || result;
};

window.fetchAllBorrowings = async function(limit = 100, offset = 0, status = null) {
    let url = `/borrowings?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    const result = await apiRequest(url);
    return result;
};

window.borrowBook = async function(bookId, userId, dueDate) {
    const result = await apiRequest('/borrowings', {
        method: 'POST',
        body: JSON.stringify({ book_id: bookId, user_id: userId, due_date: dueDate })
    });
    return result.borrowing || result;
};

window.returnBook = async function(borrowingId) {
    const result = await apiRequest(`/borrowings/${borrowingId}/return`, { method: 'PUT' });
    return result;
};

window.confirmReturn = async function(borrowingId) {
    const result = await apiRequest(`/borrowings/${borrowingId}/confirm`, { method: 'PUT' });
    return result;
};

window.fetchOverdueBooks = async function() {
    const result = await apiRequest('/borrowings/overdue');
    return result.overdue || result;
};

// ============================================================
// USERS API
// ============================================================

window.fetchCurrentUser = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    if (!userId) throw new Error('User not logged in');
    const result = await apiRequest(`/users/profile/${userId}`);
    return result.user || result;
};

window.fetchUserProfile = async function(userId) {
    const result = await apiRequest(`/users/profile/${userId}`);
    return result.user || result;
};

window.fetchAllUsers = async function(limit = 100, offset = 0) {
    const result = await apiRequest(`/users?limit=${limit}&offset=${offset}`);
    return result.users || result;
};

window.updateUserProfile = async function(userId, userData) {
    const result = await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
    return result.user || result;
};

window.changePassword = async function(userId, currentPassword, newPassword) {
    return apiRequest(`/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });
};

window.deleteUser = async function(userId) {
    return apiRequest(`/users/${userId}`, { method: 'DELETE' });
};

// ============================================================
// E-LIBRARY API
// ============================================================

window.fetchUserSessions = async function() {
    const userId = localStorage.getItem('ulitms_user_id');
    if (!userId) throw new Error('User not logged in');
    const result = await apiRequest(`/elibrary/sessions/user/${userId}`);
    return result.sessions || result;
};

window.fetchAllSessions = async function(limit = 100, offset = 0, activeOnly = false) {
    let url = `/elibrary/sessions?limit=${limit}&offset=${offset}`;
    if (activeOnly) url += `&activeOnly=true`;
    const result = await apiRequest(url);
    return result;
};

window.fetchActiveSessions = async function() {
    const result = await apiRequest('/elibrary/sessions/active');
    return result.sessions || result;
};

window.startSession = async function(unitId, purpose) {
    const result = await apiRequest('/elibrary/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ unit_id: unitId, purpose })
    });
    return result.session || result;
};

window.endSession = async function(sessionId) {
    const result = await apiRequest(`/elibrary/sessions/${sessionId}/end`, { method: 'PUT' });
    return result.session || result;
};

window.fetchELibraryUnits = async function(activeOnly = true) {
    const result = await apiRequest(`/elibrary/units?activeOnly=${activeOnly}`);
    return result.units || result;
};

window.fetchUnitById = async function(unitId) {
    const result = await apiRequest(`/elibrary/units/${unitId}`);
    return result.unit || result;
};

window.createELibraryUnit = async function(unitData) {
    const result = await apiRequest('/elibrary/units', {
        method: 'POST',
        body: JSON.stringify(unitData)
    });
    return result.unit || result;
};

window.updateELibraryUnit = async function(unitId, unitData) {
    const result = await apiRequest(`/elibrary/units/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify(unitData)
    });
    return result.unit || result;
};

window.deleteELibraryUnit = async function(unitId) {
    await apiRequest(`/elibrary/units/${unitId}`, { method: 'DELETE' });
};

// ============================================================
// PERIPHERALS API
// ============================================================

window.fetchPeripherals = async function(unitId = null, limit = 100, offset = 0) {
    let url = `/peripherals?limit=${limit}&offset=${offset}`;
    if (unitId) url += `&unit_id=${unitId}`;
    const result = await apiRequest(url);
    return result.peripherals || result;
};

window.fetchPeripheralById = async function(id) {
    const result = await apiRequest(`/peripherals/${id}`);
    return result.peripheral || result;
};

window.createPeripheral = async function(peripheralData) {
    const result = await apiRequest('/peripherals', {
        method: 'POST',
        body: JSON.stringify(peripheralData)
    });
    return result.peripheral || result;
};

window.updatePeripheral = async function(id, peripheralData) {
    const result = await apiRequest(`/peripherals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(peripheralData)
    });
    return result.peripheral || result;
};

window.updatePeripheralCondition = async function(id, condition) {
    const result = await apiRequest(`/peripherals/${id}/condition`, {
        method: 'PUT',
        body: JSON.stringify({ condition })
    });
    return result.peripheral || result;
};

window.deletePeripheral = async function(id) {
    return apiRequest(`/peripherals/${id}`, { method: 'DELETE' });
};

window.fetchPeripheralCategories = async function() {
    const result = await apiRequest('/peripherals/categories');
    return result.categories || result;
};

window.createPeripheralCategory = async function(name, description) {
    const result = await apiRequest('/peripherals/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description })
    });
    return result.category || result;
};

// ============================================================
// DAMAGE REPORTS API
// ============================================================

window.fetchDamageReports = async function(limit = 100, offset = 0, status = null, severity = null) {
    let url = `/damage-reports?limit=${limit}&offset=${offset}`;
    if (status) url += `&status=${status}`;
    if (severity) url += `&severity=${severity}`;
    const result = await apiRequest(url);
    return result.reports || result;
};

window.fetchDamageReportById = async function(id) {
    const result = await apiRequest(`/damage-reports/${id}`);
    return result.report || result;
};

window.createDamageReport = async function(reportData) {
    const result = await apiRequest('/damage-reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
    });
    return result.report || result;
};

window.resolveDamageReport = async function(id, resolutionNotes) {
    const result = await apiRequest(`/damage-reports/${id}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ resolution_notes: resolutionNotes })
    });
    return result.report || result;
};

window.getUserDamageReports = async function(userId) {
    const result = await apiRequest(`/damage-reports?reported_by=${userId}`);
    return result.reports || result;
};

window.fetchDamageReportStats = async function() {
    const result = await apiRequest('/damage-reports/stats');
    return result.stats || result;
};

window.deleteDamageReport = async function(id) {
    return apiRequest(`/damage-reports/${id}`, { method: 'DELETE' });
};

window.fetchDamageReportStats = async function() {
    const result = await apiRequest('/damage-reports/stats');
    return result.stats || result;
};

console.log('✅ API Service Loaded - Using:', API_BASE_URL);