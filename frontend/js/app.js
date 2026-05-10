// ============================================================
// ULITMS Main Application - Backend Integrated
// ============================================================

// Global state
let currentBooks = [];
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if logged in
    const token = localStorage.getItem('ulitms_token');
    if (!token) return;
    
    // Update user interface
    if (window.updateUserInterface) updateUserInterface();
    
    // Load dashboard data
    loadDashboard();
    
    // Setup navigation
    setupNavigation();
});

// Setup navigation event listeners
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.removeEventListener('click', navigationHandler);
        el.addEventListener('click', navigationHandler);
    });
}

function navigationHandler(e) {
    const page = this.dataset.page;
    if (page) navigate(page);
}

// Navigate to page
window.navigate = async function(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) targetPage.classList.add('active');
    
    // Update title
    const pageTitles = {
        dashboard: 'Dashboard',
        catalog: 'Book Catalog',
        borrowings: 'My Borrowings',
        elibrary: 'E-Library',
        manage: 'Manage Books',
        inventory: 'Book Inventory',
        userManagement: 'User Management',
        equipmentMaintenance: 'Equipment & Maintenance',
        profile: 'My Profile',
        password: 'Change Password'
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;
    
    // Update active nav
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    // Load page data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'catalog':
            loadCatalog();
            break;
        case 'borrowings':
            loadBorrowings();
            break;
        case 'elibrary':
            loadELibrary();
            break;
        case 'manage':
            if (isAdmin()) loadManageBooks();
            break;
        case 'inventory':
            if (isAdmin()) loadInventory();
            break;
        case 'userManagement':
            if (isAdmin()) loadUserManagement();
            break;
        case 'equipmentMaintenance':
            if (isAdmin()) loadEquipmentMaintenance();
            break;
        case 'profile':
            loadProfile();
            break;
    }
};

// Helper functions
function isAdmin() {
    return localStorage.getItem('ulitms_role') === 'admin';
}

function getCurrentUserId() {
    return localStorage.getItem('ulitms_user_id');
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
    if (!window.ULITMS_API) return;
    
    const role = localStorage.getItem('ulitms_role');
    const name = localStorage.getItem('ulitms_name');
    
    // Update welcome message
    const welcomeSpan = document.getElementById('dashboard-welcome');
    const subSpan = document.getElementById('dashboard-sub');
    if (welcomeSpan) welcomeSpan.innerHTML = `Welcome back, ${name}! ${role === 'admin' ? '👑' : '👋'}`;
    if (subSpan) subSpan.innerHTML = role === 'admin' ? 'System overview & management dashboard' : "Here's your library summary for today";
    
    try {
        if (role === 'admin') {
            // Admin stats
            const booksData = await ULITMS_API.getBooks({ limit: 1 });
            const usersData = await ULITMS_API.getAllUsers();
            const borrowingsData = await ULITMS_API.getAllBorrowings({ limit: 1 });
            
            const statsDiv = document.getElementById('dashboard-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    <div class="stat-card"><div class="label">Total Books</div><div class="value">${booksData.data?.total || 0}</div></div>
                    <div class="stat-card"><div class="label">Total Users</div><div class="value">${usersData.data?.users?.length || 0}</div></div>
                    <div class="stat-card"><div class="label">Active Borrowings</div><div class="value">${borrowingsData.data?.borrowings?.filter(b => b.status !== 'returned').length || 0}</div></div>
                `;
            }
            
            const recentDiv = document.getElementById('dashboard-recent');
            if (recentDiv) {
                recentDiv.innerHTML = `
                    <div class="card-title">Recent Activity</div>
                    <div class="activity-text">📊 System ready. Use the sidebar to manage books, users, and monitor E-Library usage.</div>
                `;
            }
        } else {
            // User stats
            const userId = getCurrentUserId();
            if (userId) {
                const profileData = await ULITMS_API.getUserStats();
                const borrowingsData = await ULITMS_API.getMyBorrowings();
                
                const statsDiv = document.getElementById('dashboard-stats');
                if (statsDiv) {
                    statsDiv.innerHTML = `
                        <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${borrowingsData.data?.borrowings?.filter(b => b.status === 'borrowed').length || 0}</div></div>
                        <div class="stat-card"><div class="label">Total Sessions</div><div class="value">${profileData.data?.stats?.total_sessions || 0}</div></div>
                        <div class="stat-card"><div class="label">Books Available</div><div class="value">Loading...</div></div>
                    `;
                }
                
                // Get available books count
                const booksData = await ULITMS_API.getBooks({ limit: 1 });
                if (statsDiv) {
                    const availableEl = statsDiv.querySelector('.stat-card:last-child .value');
                    if (availableEl) availableEl.textContent = booksData.data?.total || 0;
                }
            }
        }
        
        // Alert
        const alertDiv = document.getElementById('dashboard-alert');
        if (alertDiv) {
            alertDiv.innerHTML = `<div class="alert-box"><div class="alert-icon"><i class="fas fa-info-circle"></i></div><div class="alert-text">Library hours: Mon-Fri 8AM - 8PM | Sat 9AM - 5PM</div></div>`;
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// ============================================================
// BOOK CATALOG
// ============================================================

async function loadCatalog() {
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    // Show loading
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading books...</td></tr>';
    
    try {
        const result = await ULITMS_API.getBooks({ limit: 100 });
        currentBooks = result.data?.books || [];
        
        if (currentBooks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No books found</td></tr>';
            return;
        }
        
        tbody.innerHTML = currentBooks.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">
                    ${book.available_copies > 0 ? 'Available' : 'Borrowed'}
                </span></td>
            </tr>
        `).join('');
        
        // Update count
        const countEl = document.getElementById('book-count');
        if (countEl) countEl.textContent = `${currentBooks.length} books`;
        
        // Setup search
        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            searchInput.removeEventListener('input', catalogSearchHandler);
            searchInput.addEventListener('input', catalogSearchHandler);
        }
        
        // Setup filter buttons
        setupFilterButtons();
        
    } catch (error) {
        console.error('Load catalog error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-400">Failed to load books. Please try again.</td></tr>';
    }
}

function catalogSearchHandler(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = currentBooks.filter(book => 
        book.title?.toLowerCase().includes(searchTerm) ||
        book.author?.toLowerCase().includes(searchTerm) ||
        book.isbn?.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No matching books found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(book => `
        <tr>
            <td>${book.isbn || 'N/A'}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category_name || 'Uncategorized'}</td>
            <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">
                ${book.available_copies > 0 ? 'Available' : 'Borrowed'}
            </span></td>
        </tr>
    `).join('');
}

function setupFilterButtons() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.removeEventListener('click', filterHandler);
        btn.addEventListener('click', filterHandler);
    });
}

async function filterBooks(category) {
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = 'rgba(12,168,177,.1)';
        btn.style.color = '#94a3b8';
    });
    const activeBtn = document.querySelector(`.filter-btn[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.style.background = 'rgba(12,168,177,.2)';
        activeBtn.style.color = '#6adde2';
    }
    
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        let books;
        if (category === 'all') {
            books = currentBooks;
        } else {
            // Filter by category
            books = currentBooks.filter(book => book.category_name === category);
        }
        
        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No books in this category</td></tr>';
            return;
        }
        
        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">
                    ${book.available_copies > 0 ? 'Available' : 'Borrowed'}
                </span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Filter error:', error);
    }
}

// ============================================================
// MY BORROWINGS
// ============================================================

async function loadBorrowings() {
    const tbody = document.getElementById('borrow-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const result = await ULITMS_API.getMyBorrowings();
        const borrowings = result.data?.borrowings || [];
        
        if (borrowings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No borrowing records found</td></tr>';
        } else {
            tbody.innerHTML = borrowings.map(b => `
                <tr>
                    <td><span style="color:#27c4cc">#${b.id}</span></td>
                    <td>${b.title}</td>
                    <td>${new Date(b.borrowed_at).toLocaleDateString()}</td>
                    <td>${new Date(b.due_date).toLocaleDateString()}</td>
                    <td><span class="badge ${b.status === 'borrowed' ? 'badge-yellow' : 'badge-gray'}">
                        ${b.status === 'borrowed' ? 'Active' : 'Returned'}
                    </span></td>
                </tr>
            `).join('');
        }
        
        // Update stats
        const statsDiv = document.getElementById('borrow-stats');
        if (statsDiv) {
            const activeCount = borrowings.filter(b => b.status === 'borrowed').length;
            statsDiv.innerHTML = `
                <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${activeCount}</div></div>
                <div class="stat-card"><div class="label">Total Borrowed</div><div class="value">${borrowings.length}</div></div>
                <div class="stat-card"><div class="label">Overdue Fines</div><div class="value">₱0</div></div>
            `;
        }
    } catch (error) {
        console.error('Load borrowings error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-red-400">Failed to load borrowings</td></tr>';
    }
}

// ============================================================
// E-LIBRARY
// ============================================================

async function loadELibrary() {
    const tbody = document.getElementById('elib-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const userId = getCurrentUserId();
        if (!userId) throw new Error('User not logged in');
        
        const result = await ULITMS_API.getUserSessions(userId);
        const sessions = result.data?.sessions || [];
        
        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No E-Library sessions found</td></tr>';
        } else {
            tbody.innerHTML = sessions.map(s => {
                const timeIn = new Date(s.time_in).toLocaleTimeString();
                const timeOut = s.time_out ? new Date(s.time_out).toLocaleTimeString() : '--:--';
                const duration = s.time_out ? 
                    `${Math.round((new Date(s.time_out) - new Date(s.time_in)) / (1000 * 60))} min` : 
                    'ongoing';
                
                return `
                    <tr>
                        <td>${new Date(s.time_in).toLocaleDateString()}</td>
                        <td>Unit ${s.unit_number}</td>
                        <td>${timeIn}</td>
                        <td>${timeOut}</td>
                        <td>${duration}</td>
                        <td><span class="badge ${!s.time_out ? 'badge-teal' : 'badge-gray'}">
                            ${!s.time_out ? 'In Use' : 'Completed'}
                        </span></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Load E-Library error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400">Failed to load sessions</td></tr>';
    }
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

async function loadManageBooks() {
    if (!isAdmin()) return;
    
    const tbody = document.getElementById('manage-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const result = await ULITMS_API.getBooks({ limit: 100 });
        const books = result.data?.books || [];
        
        tbody.innerHTML = books.map((book, idx) => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>
                    <select class="form-input" style="width:120px" onchange="updateBookStatus(${book.id}, this.value)">
                        <option ${book.available_copies > 0 ? 'selected' : ''}>Available</option>
                        <option ${book.available_copies === 0 ? 'selected' : ''}>Borrowed</option>
                    </select>
                 </td>
                <td>
                    <button class="btn-small" onclick="editBook(${book.id})">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteBook(${book.id})">Delete</button>
                 </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load manage books error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400">Failed to load books</td></tr>';
    }
}

async function loadInventory() {
    if (!isAdmin()) return;
    
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const result = await ULITMS_API.getBooks({ limit: 100 });
        const books = result.data?.books || [];
        
        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">
                    ${book.available_copies > 0 ? 'Available' : 'Borrowed'}
                </span></td>
                <td><button class="btn-small" onclick="navigate('manage')">Manage</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load inventory error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400">Failed to load inventory</td></tr>';
    }
}

async function loadUserManagement() {
    if (!isAdmin()) return;
    
    const tbody = document.getElementById('user-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const result = await ULITMS_API.getAllUsers();
        const users = result.data?.users || [];
        const regularUsers = users.filter(u => u.role !== 'admin');
        
        tbody.innerHTML = regularUsers.map(user => `
            <tr>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.student_id || 'N/A'}</td>
                <td>${user.course || 'N/A'}</td>
                <td>Student</td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteUserAccount(${user.id})">Remove</button>
                 </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load users error:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400">Failed to load users</td></tr>';
    }
}

// Book management functions
window.updateBookStatus = async function(bookId, newStatus) {
    try {
        await ULITMS_API.updateBook(bookId, { 
            status: newStatus === 'Available' ? 'available' : 'borrowed' 
        });
        showToast('Book status updated', 'success');
        loadManageBooks();
        loadInventory();
        loadCatalog();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.editBook = async function(bookId) {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
        try {
            await ULITMS_API.updateBook(bookId, { title: newTitle });
            showToast('Book updated', 'success');
            loadManageBooks();
            loadInventory();
            loadCatalog();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.deleteBook = async function(bookId) {
    if (confirm('Delete this book permanently?')) {
        try {
            await ULITMS_API.deleteBook(bookId);
            showToast('Book deleted', 'success');
            loadManageBooks();
            loadInventory();
            loadCatalog();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.showAddBookModal = function() {
    const isbn = prompt('Enter ISBN:');
    const title = prompt('Enter book title:');
    const author = prompt('Enter author:');
    const category = prompt('Enter category:');
    const totalCopies = prompt('Enter number of copies:');
    
    if (isbn && title && author && category && totalCopies) {
        createBook({
            isbn,
            title,
            author,
            category_id: 1, // Default category - you might want to fetch categories
            total_copies: parseInt(totalCopies),
            description: '',
        }).catch(error => showToast(error.message, 'error'));
    }
};

async function createBook(bookData) {
    try {
        await ULITMS_API.createBook(bookData);
        showToast('Book added successfully!', 'success');
        loadManageBooks();
        loadInventory();
        loadCatalog();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.deleteUserAccount = async function(userId) {
    if (confirm('Delete this user permanently? This action cannot be undone.')) {
        try {
            await ULITMS_API.deleteUser(userId);
            showToast('User deleted successfully', 'success');
            loadUserManagement();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.exportToPDF = function() {
    showToast('PDF export feature coming soon', 'info');
};

// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading profile...</div>';
    
    try {
        const result = await ULITMS_API.getCurrentUser();
        const user = result.data?.user;
        
        if (!user) throw new Error('User not found');
        
        const name = `${user.first_name} ${user.last_name}`;
        const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
        const role = user.role === 'admin' ? 'Administrator' : 'Student';
        
        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">${initials}</div>
                <div>
                    <div class="profile-name">${name}</div>
                    <div class="profile-meta">${user.student_id || 'N/A'} · ${role}</div>
                    <div><span class="badge badge-green">Active</span></div>
                </div>
            </div>
            <div class="card">
                <div class="card-title">Personal Details</div>
                <div class="detail-row"><span class="detail-key">ID Number</span><span class="detail-val">${user.student_id || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Full Name</span><span class="detail-val">${name}</span></div>
                <div class="detail-row"><span class="detail-key">Role</span><span class="detail-val">${role}</span></div>
                <div class="detail-row"><span class="detail-key">Email</span><span class="detail-val">${user.email}</span></div>
                <div class="detail-row"><span class="detail-key">Course</span><span class="detail-val">${user.course || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Year Level</span><span class="detail-val">${user.year_level || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Contact</span><span class="detail-val">${user.contact_number || 'N/A'}</span></div>
            </div>
        `;
    } catch (error) {
        console.error('Load profile error:', error);
        container.innerHTML = '<div class="text-center text-red-400">Failed to load profile</div>';
    }
}

// Change password function
window.changePassword = async function() {
    const current = document.getElementById('current-password')?.value;
    const newPass = document.getElementById('new-password')?.value;
    const confirm = document.getElementById('confirm-password')?.value;
    
    if (!current || !newPass || !confirm) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPass.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const userId = getCurrentUserId();
    if (!userId) {
        showToast('User not found', 'error');
        return;
    }
    
    try {
        await ULITMS_API.changePassword(userId, current, newPass);
        showToast('Password changed successfully!', 'success');
        
        // Clear fields
        if (document.getElementById('current-password')) document.getElementById('current-password').value = '';
        if (document.getElementById('new-password')) document.getElementById('new-password').value = '';
        if (document.getElementById('confirm-password')) document.getElementById('confirm-password').value = '';
    } catch (error) {
        showToast(error.message || 'Failed to change password', 'error');
    }
};

// ============================================================
// EQUIPMENT MAINTENANCE
// ============================================================

let currentEquipment = [];
let currentDamageReports = [];

async function loadEquipmentMaintenance() {
    // Load equipment stats
    await loadEquipmentStats();
    // Load damage reports
    await loadDamageReports();
}

async function loadEquipmentStats() {
    try {
        const result = await ULITMS_API.getAllPeripherals();
        const peripherals = result.data?.peripherals || [];
        currentEquipment = peripherals;
        
        const total = peripherals.length;
        const good = peripherals.filter(p => p.condition === 'good').length;
        const repair = peripherals.filter(p => p.condition === 'repair_needed' || p.condition === 'damaged').length;
        
        // Get unique categories count
        const categories = new Set(peripherals.map(p => p.category_name).filter(Boolean));
        
        document.getElementById('total-equipment').textContent = total;
        document.getElementById('good-equipment').textContent = good;
        document.getElementById('repair-equipment').textContent = repair;
        document.getElementById('category-count').textContent = categories.size;
        
        // Render equipment table
        const tbody = document.getElementById('equipment-tbody');
        if (tbody) {
            tbody.innerHTML = peripherals.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.category_name || 'Uncategorized'}</td>
                    <td>${p.brand || '-'} ${p.model || ''}</td>
                    <td>${p.serial_number || '-'}</td>
                    <td>Unit ${p.unit_number || '-'}</td>
                    <td><span class="badge ${getConditionBadgeClass(p.condition)}">${p.condition || 'good'}</span></td>
                    <td><span class="badge ${p.is_active ? 'badge-green' : 'badge-red'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-small" onclick="editEquipment(${p.id})">Edit</button>
                        <button class="btn-small btn-danger" onclick="deleteEquipment(${p.id})">Delete</button>
                     </td>
                </tr>
            `).join('');
        }
        
        // Setup search
        const searchInput = document.getElementById('equipment-search');
        if (searchInput) {
            searchInput.removeEventListener('input', equipmentSearchHandler);
            searchInput.addEventListener('input', equipmentSearchHandler);
        }
    } catch (error) {
        console.error('Load equipment error:', error);
    }
}

function getConditionBadgeClass(condition) {
    switch(condition) {
        case 'good': return 'badge-green';
        case 'damaged': return 'badge-red';
        case 'repair_needed': return 'badge-yellow';
        default: return 'badge-gray';
    }
}

function equipmentSearchHandler(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = currentEquipment.filter(eq => 
        eq.name?.toLowerCase().includes(searchTerm) ||
        eq.brand?.toLowerCase().includes(searchTerm) ||
        eq.serial_number?.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('equipment-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category_name || 'Uncategorized'}</td>
            <td>${p.brand || '-'} ${p.model || ''}</td>
            <td>${p.serial_number || '-'}</td>
            <td>Unit ${p.unit_number || '-'}</td>
            <td><span class="badge ${getConditionBadgeClass(p.condition)}">${p.condition || 'good'}</span></td>
            <td><span class="badge ${p.is_active ? 'badge-green' : 'badge-red'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-small" onclick="editEquipment(${p.id})">Edit</button>
                <button class="btn-small btn-danger" onclick="deleteEquipment(${p.id})">Delete</button>
             </td>
        </tr>
    `).join('');
}

async function loadDamageReports() {
    try {
        const result = await ULITMS_API.getDamageReports();
        const reports = result.data?.reports || [];
        currentDamageReports = reports;
        
        const total = reports.length;
        const pending = reports.filter(r => !r.resolved_by).length;
        const resolved = reports.filter(r => r.resolved_by).length;
        const critical = reports.filter(r => r.severity === 'critical' || r.severity === 'high').length;
        
        document.getElementById('total-reports').textContent = total;
        document.getElementById('pending-reports').textContent = pending;
        document.getElementById('resolved-reports').textContent = resolved;
        document.getElementById('critical-reports').textContent = critical;
        
        // Render damage table
        const tbody = document.getElementById('damage-tbody');
        if (tbody) {
            tbody.innerHTML = reports.map(r => `
                <tr>
                    <td>#${r.id}</td>
                    <td>${r.reporter_name || 'Unknown'}</td>
                    <td>${r.peripheral_name || `Unit ${r.unit_number}` || 'N/A'}</td>
                    <td>${r.damage_type || 'General'}</td>
                    <td><span class="badge ${getSeverityBadgeClass(r.severity)}">${r.severity || 'low'}</span></td>
                    <td><span class="badge ${r.resolved_by ? 'badge-green' : 'badge-red'}">${r.resolved_by ? 'Resolved' : 'Pending'}</span></td>
                    <td>${new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                        ${!r.resolved_by ? `<button class="btn-small" onclick="resolveDamage(${r.id})">Resolve</button>` : ''}
                        <button class="btn-small" onclick="viewDamageDetails(${r.id})">View</button>
                     </td>
                </tr>
            `).join('');
        }
        
        // Setup search
        const searchInput = document.getElementById('damage-search');
        if (searchInput) {
            searchInput.removeEventListener('input', damageSearchHandler);
            searchInput.addEventListener('input', damageSearchHandler);
        }
    } catch (error) {
        console.error('Load damage reports error:', error);
    }
}

function getSeverityBadgeClass(severity) {
    switch(severity) {
        case 'critical': return 'badge-red';
        case 'high': return 'badge-red';
        case 'medium': return 'badge-yellow';
        default: return 'badge-blue';
    }
}

function damageSearchHandler(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = currentDamageReports.filter(r => 
        r.damage_type?.toLowerCase().includes(searchTerm) ||
        r.peripheral_name?.toLowerCase().includes(searchTerm) ||
        r.reporter_name?.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('damage-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map(r => `
        <tr>
            <td>#${r.id}</td>
            <td>${r.reporter_name || 'Unknown'}</td>
            <td>${r.peripheral_name || `Unit ${r.unit_number}` || 'N/A'}</td>
            <td>${r.damage_type || 'General'}</td>
            <td><span class="badge ${getSeverityBadgeClass(r.severity)}">${r.severity || 'low'}</span></td>
            <td><span class="badge ${r.resolved_by ? 'badge-green' : 'badge-red'}">${r.resolved_by ? 'Resolved' : 'Pending'}</span></td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td>
                ${!r.resolved_by ? `<button class="btn-small" onclick="resolveDamage(${r.id})">Resolve</button>` : ''}
                <button class="btn-small" onclick="viewDamageDetails(${r.id})">View</button>
             </td>
        </tr>
    `).join('');
}

// Equipment management functions
window.showAddEquipmentModal = function() {
    const name = prompt('Enter equipment name:');
    const category = prompt('Enter category (Keyboard, Mouse, Monitor, etc.):');
    const brand = prompt('Enter brand:');
    const serial = prompt('Enter serial number:');
    const unitId = prompt('Enter assigned unit number (1-20):');
    
    if (name && unitId) {
        createEquipment({
            name,
            category_name: category || 'Other',
            brand: brand || null,
            serial_number: serial || null,
            unit_id: parseInt(unitId),
            condition: 'good'
        });
    }
};

async function createEquipment(equipmentData) {
    try {
        await ULITMS_API.createPeripheral(equipmentData);
        showToast('Equipment added successfully!', 'success');
        loadEquipmentStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.editEquipment = async function(id) {
    const equipment = currentEquipment.find(e => e.id === id);
    if (!equipment) return;
    
    const newCondition = prompt('Enter new condition (good/damaged/repair_needed):', equipment.condition);
    if (newCondition && ['good', 'damaged', 'repair_needed'].includes(newCondition)) {
        try {
            await ULITMS_API.updatePeripheralCondition(id, newCondition);
            showToast('Equipment condition updated', 'success');
            loadEquipmentStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.deleteEquipment = async function(id) {
    if (confirm('Delete this equipment? This action cannot be undone.')) {
        try {
            await ULITMS_API.deletePeripheral(id);
            showToast('Equipment deleted', 'success');
            loadEquipmentStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

// Damage report functions
window.showAddDamageModal = function() {
    const damageType = prompt('Enter damage type (e.g., Cracked Screen, Broken Key, etc.):');
    const description = prompt('Enter description of the issue:');
    const severity = prompt('Enter severity (low/medium/high/critical):', 'medium');
    const equipmentId = prompt('Enter equipment ID (peripheral ID):');
    
    if (damageType && description && equipmentId) {
        createDamageReport({
            peripheral_id: parseInt(equipmentId),
            damage_type: damageType,
            description: description,
            severity: severity
        });
    }
};

async function createDamageReport(reportData) {
    try {
        await ULITMS_API.createDamageReport(reportData);
        showToast('Damage report submitted', 'success');
        loadDamageReports();
        loadEquipmentStats(); // Refresh equipment stats
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.resolveDamage = async function(id) {
    const notes = prompt('Enter resolution notes:');
    if (notes) {
        try {
            await ULITMS_API.resolveDamageReport(id, notes);
            showToast('Damage report resolved', 'success');
            loadDamageReports();
            loadEquipmentStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.viewDamageDetails = async function(id) {
    try {
        const result = await ULITMS_API.getDamageReportById(id);
        const report = result.data?.report;
        if (report) {
            alert(`Damage Report #${report.id}\n\nType: ${report.damage_type}\nDescription: ${report.description}\nSeverity: ${report.severity}\nReported: ${new Date(report.created_at).toLocaleString()}\nStatus: ${report.resolved_by ? 'Resolved' : 'Pending'}`);
        }
    } catch (error) {
        showToast('Failed to load report details', 'error');
    }
};

// Tab switching for equipment maintenance
window.switchMaintenanceTab = function(tab) {
    const equipmentTab = document.getElementById('equipment-tab');
    const damageTab = document.getElementById('damage-tab');
    const tabs = document.querySelectorAll('.tab-btn');
    
    if (tab === 'equipment') {
        if (equipmentTab) equipmentTab.style.display = 'block';
        if (damageTab) damageTab.style.display = 'none';
    } else {
        if (equipmentTab) equipmentTab.style.display = 'none';
        if (damageTab) damageTab.style.display = 'block';
    }
    
    tabs.forEach(btn => {
        btn.style.color = '#94a3b8';
        btn.style.borderBottom = '2px solid transparent';
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.style.color = '#6adde2';
        activeBtn.style.borderBottom = '2px solid #27c4cc';
    }
};

// Make functions globally available
window.filterBooks = filterBooks;
window.loadAllData = function() {
    updateUserInterface();
    loadDashboard();
};