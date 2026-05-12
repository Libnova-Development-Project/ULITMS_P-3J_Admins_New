// ============================================================
// ULITMS Main Application - COMPLETE FIXED VERSION
// ============================================================

// Global state
let currentBooks = [];
let currentUser = null;
let currentBorrowings = [];
let currentEquipment = [];
let currentDamageReports = [];

// Toast notification system
function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Optional: Add a nice toast UI
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#27c4cc'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Update user interface based on login status
window.updateUserInterface = function() {
    const token = localStorage.getItem('ulitms_token');
    const role = localStorage.getItem('ulitms_role');
    const name = localStorage.getItem('ulitms_name');
    const initials = (name || 'G').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    // Show/hide auth overlay
    const authOverlay = document.getElementById('auth-landing');
    if (!token && authOverlay) {
        authOverlay.style.display = 'flex';
        document.getElementById('main').style.display = 'none';
        return;
    } else if (authOverlay) {
        authOverlay.style.display = 'none';
        document.getElementById('main').style.display = 'flex';
    }
    
    // Update sidebar user info
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (sidebarName) sidebarName.textContent = name || 'User';
    if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
    
    // Update topbar user info
    const topbarAvatar = document.getElementById('topbar-avatar');
    const topbarName = document.getElementById('topbar-user-name');
    const topbarRole = document.getElementById('topbar-user-role');
    
    if (topbarAvatar) topbarAvatar.textContent = initials;
    if (topbarName) topbarName.textContent = name || 'User';
    if (topbarRole) topbarRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
    
    // Show/hide role-based menu items
    const userOnlyItems = document.querySelectorAll('.user-only');
    const adminOnlyItems = document.querySelectorAll('.admin-only');
    
    userOnlyItems.forEach(el => {
        el.style.display = role === 'admin' ? 'none' : 'flex';
    });
    
    adminOnlyItems.forEach(el => {
        el.style.display = role === 'admin' ? 'flex' : 'none';
    });
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if logged in
    const token = localStorage.getItem('ulitms_token');
    
    // Update UI first
    updateUserInterface();
    
    if (!token) {
        // Show login screen
        console.log('No token found, showing login screen');
        return;
    }
    
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
        damagereport: 'Report Damage',
        elibrary: 'E-Library',
        manage: 'Manage Books',
        inventory: 'Book Inventory',
        userManagement: 'User Management',
        equipmentMaintenance: 'Equipment & Maintenance',
        'elibrary-admin': 'E-Library Management',
        'damage-admin': 'Damage Reports',
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
            displayAvailablePCs();
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
        case 'elibrary-admin':
            if (isAdmin()) loadELibraryManagement();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'password':
            loadPasswordChange();
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
    const role = localStorage.getItem('ulitms_role');
    const name = localStorage.getItem('ulitms_name');
    
    // Update welcome message
    const welcomeSpan = document.getElementById('dashboard-welcome');
    const subSpan = document.getElementById('dashboard-sub');
    if (welcomeSpan) welcomeSpan.innerHTML = `Welcome back, ${name || 'User'}! ${role === 'admin' ? '👑' : '👋'}`;
    if (subSpan) subSpan.innerHTML = role === 'admin' ? 'System overview & management dashboard' : "Here's your library summary for today";
    
    try {
        // Fetch real stats
        const books = await fetchBooks();
        const borrowings = await fetchMyBorrowings().catch(() => []);
        
        const statsDiv = document.getElementById('dashboard-stats');
        if (statsDiv) {
            const bookCount = books.books?.length || books.length || 0;
            const borrowingCount = borrowings.length || 0;
            
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="label">📚 Books Available</div>
                    <div class="value" style="color:#27c4cc;">${bookCount}</div>
                </div>
                <div class="stat-card">
                    <div class="label">👥 ${role === 'admin' ? 'Users' : 'Sessions'}</div>
                    <div class="value" style="color:#60a5fa;">${borrowingCount}</div>
                </div>
                <div class="stat-card">
                    <div class="label">📋 Transactions</div>
                    <div class="value" style="color:#4ade80;">${borrowingCount}</div>
                </div>
            `;
        }
        
        // Alert box
        const alertDiv = document.getElementById('dashboard-alert');
        if (alertDiv) {
            alertDiv.innerHTML = `
                <div class="alert-box" style="background: rgba(12,168,177,0.1); border-left: 3px solid #27c4cc; padding: 16px; border-radius: 8px;">
                    <div style="display: flex; gap: 12px;">
                        <div><i class="fas fa-info-circle" style="color: #27c4cc; font-size: 18px;"></i></div>
                        <div style="color: #cbd5e1;">📖 Library hours: Mon-Fri 8AM - 8PM | Sat 9AM - 5PM | Closed Sundays</div>
                    </div>
                </div>
            `;
        }
        
        // Recent activity
        const recentDiv = document.getElementById('dashboard-recent');
        if (recentDiv && borrowings.length > 0) {
            recentDiv.innerHTML = `
                <div class="card-title">🔄 Recent Activity</div>
                ${borrowings.slice(0, 5).map(b => `
                    <div class="activity-item">
                        <div class="activity-dot" style="background: ${b.status === 'borrowed' ? '#27c4cc' : '#10b981'};"></div>
                        <div class="activity-text">${b.book_title || 'Book'} - ${b.status === 'borrowed' ? 'Borrowed' : 'Returned'}</div>
                        <div class="activity-time">${new Date(b.borrowed_at || b.returned_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Failed to load dashboard', 'error');
    }
}

// ============================================================
// BOOK CATALOG
// ============================================================

async function loadCatalog() {
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">📚 Loading catalog...</td></tr>';
    
    try {
        const result = await fetchBooks();
        currentBooks = result.books || [];
        
        if (currentBooks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No books found</td></tr>';
            return;
        }
        
        tbody.innerHTML = currentBooks.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="color: ${book.available_copies > 0 ? '#10b981' : '#f87171'}">
                            ${book.available_copies > 0 ? '✓ Available' : '✗ Borrowed'}
                        </span>
                        ${book.available_copies > 0 ? `
                            <button class="btn-small" onclick="showBorrowModal(${book.id}, '${book.title}')">
                                <i class="fas fa-book-open"></i> Borrow
                            </button>
                        ` : ''}
                    </div>
                </td>
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#f87171;">Failed to load books</td></tr>';
        showToast('Failed to load catalog', 'error');
    }
}

function setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.removeEventListener('click', filterHandler);
        btn.addEventListener('click', filterHandler);
    });
}

function filterHandler(e) {
    const category = this.dataset.category;
    filterBooks(category);
}

window.filterBooks = function(category) {
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    // Update active button style
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = 'rgba(12,168,177,.1)';
        btn.style.color = '#94a3b8';
    });
    const activeBtn = document.querySelector(`.filter-btn[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.style.background = 'rgba(12,168,177,.2)';
        activeBtn.style.color = '#6adde2';
    }
    
    let filtered;
    if (category === 'all') {
        filtered = currentBooks;
    } else {
        filtered = currentBooks.filter(book => 
            book.category_name === category || book.category === category
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No books in this category</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="color: ${book.available_copies > 0 ? '#10b981' : '#f87171'}">
                            ${book.available_copies > 0 ? '✓ Available' : '✗ Borrowed'}
                        </span>
                        ${book.available_copies > 0 ? `
                            <button class="btn-small" onclick="showBorrowModal(${book.id}, '${book.title}')">
                                <i class="fas fa-book-open"></i> Borrow
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
};

function catalogSearchHandler(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = currentBooks.filter(book => 
        (book.title?.toLowerCase().includes(searchTerm)) ||
        (book.author?.toLowerCase().includes(searchTerm)) ||
        (book.isbn?.toLowerCase().includes(searchTerm))
    );
    
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No matching books</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="color: ${book.available_copies > 0 ? '#10b981' : '#f87171'}">
                            ${book.available_copies > 0 ? '✓ Available' : '✗ Borrowed'}
                        </span>
                        ${book.available_copies > 0 ? `
                            <button class="btn-small" onclick="showBorrowModal(${book.id}, '${book.title}')">
                                <i class="fas fa-book-open"></i> Borrow
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Borrow modal
window.showBorrowModal = function(bookId, bookTitle) {
    const dueDate = prompt(`Enter due date for "${bookTitle}" (YYYY-MM-DD):`, getDefaultDueDate());
    if (dueDate) {
        borrowBook(bookId, dueDate);
    }
};

function getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14 days from now
    return date.toISOString().split('T')[0];
}

async function borrowBook(bookId, dueDate) {
    const userId = getCurrentUserId();
    if (!userId) {
        showToast('Please login to borrow books', 'error');
        return;
    }
    
    showToast('Processing borrow request...', 'info');
    
    try {
        await window.borrowBook(bookId, parseInt(userId), dueDate);
        showToast('Book borrowed successfully!', 'success');
        // Refresh catalog and borrowings
        await loadCatalog();
        await loadBorrowings();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================================
// MY BORROWINGS
// ============================================================

async function loadBorrowings() {
    const tbody = document.getElementById('borrow-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">📋 Loading borrowings...</td></tr>';
    
    try {
        const borrowings = await fetchMyBorrowings();
        currentBorrowings = borrowings;
        
        if (borrowings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No borrowing records found</td></tr>';
        } else {
            tbody.innerHTML = borrowings.map(b => {
                const isOverdue = b.status === 'overdue' || (b.status === 'borrowed' && new Date(b.due_date) < new Date());
                return `
                    <tr>
                        <td><span style="color:#27c4cc">#${b.id}</span></td>
                        <td>${b.title || b.book_title || 'N/A'}</td>
                        <td>${b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString() : 'N/A'}</td>
                        <td>${b.due_date ? new Date(b.due_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span class="badge ${b.status === 'returned' ? 'badge-gray' : (isOverdue ? 'badge-red' : 'badge-yellow')}">
                                    ${b.status === 'returned' ? 'Returned' : (isOverdue ? 'Overdue' : 'Active')}
                                </span>
                                ${b.status !== 'returned' ? `
                                    <button class="btn-small" onclick="returnBook(${b.id})">
                                        <i class="fas fa-undo-alt"></i> Return
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Update stats
        const statsDiv = document.getElementById('borrow-stats');
        if (statsDiv) {
            const activeCount = borrowings.filter(b => b.status !== 'returned').length;
            const overdueCount = borrowings.filter(b => b.status === 'overdue' || (b.status === 'borrowed' && new Date(b.due_date) < new Date())).length;
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="label">📚 Currently Borrowed</div>
                    <div class="value" style="color:#60a5fa;">${activeCount}</div>
                </div>
                <div class="stat-card">
                    <div class="label">📋 Total Transactions</div>
                    <div class="value" style="color:#27c4cc;">${borrowings.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">⚠️ Overdue</div>
                    <div class="value" style="color:#f87171;">${overdueCount}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load borrowings error:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#f87171;">Failed to load borrowings</td></tr>';
        showToast('Failed to load borrowings', 'error');
    }
}

window.returnBook = async function(borrowingId) {
    if (!confirm('Return this book?')) return;
    
    showToast('Processing return...', 'info');
    
    try {
        const result = await window.returnBook(borrowingId);
        showToast(`Book returned successfully! ${result.data?.fine > 0 ? `Fine: ₱${result.data.fine}` : ''}`, 'success');
        await loadBorrowings();
        await loadCatalog();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// E-LIBRARY
// ============================================================

async function loadELibrary() {
    const tbody = document.getElementById('elib-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">💻 Loading sessions...</td></tr>';
    
    try {
        const sessions = await fetchUserSessions();
        
        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No E-Library sessions found</td></tr>';
        } else {
            tbody.innerHTML = sessions.map(s => {
                const timeIn = new Date(s.time_in).toLocaleTimeString();
                const timeOut = s.time_out ? new Date(s.time_out).toLocaleTimeString() : '---';
                const duration = s.time_out ? 
                    `${Math.round((new Date(s.time_out) - new Date(s.time_in)) / (1000 * 60))} min` : 
                    'ongoing';
                
                return `
                    <tr>
                        <td>${new Date(s.time_in).toLocaleDateString()}</td>
                        <td>Unit ${s.unit_number || 'N/A'}</td>
                        <td>${timeIn}</td>
                        <td>${timeOut}</td>
                        <td>${duration}</td>
                        <td>
                            <span class="badge ${s.time_out ? 'badge-gray' : 'badge-teal'}">
                                ${s.time_out ? 'Completed' : 'Active'}
                            </span>
                            ${!s.time_out ? `<button class="btn-small" onclick="endELibrarySession(${s.id})">End Session</button>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Update stats
        const statsDiv = document.getElementById('elib-stats');
        if (statsDiv) {
            const activeCount = sessions.filter(s => !s.time_out).length;
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="label">💻 Active Sessions</div>
                    <div class="value" style="color:#27c4cc;">${activeCount}</div>
                </div>
                <div class="stat-card">
                    <div class="label">📊 Total Sessions</div>
                    <div class="value" style="color:#60a5fa;">${sessions.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">⏱️ Completed</div>
                    <div class="value" style="color:#4ade80;">${sessions.length - activeCount}</div>
                </div>
            `;
        }
        
        // Load available units
        await loadELibraryUnits();
        
    } catch (error) {
        console.error('Load E-Library error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#f87171;">Failed to load sessions</td></tr>';
    }
}

async function loadELibraryUnits() {
    try {
        const units = await fetchELibraryUnits();
        const select = document.getElementById('unit-select');
        if (select && units.length) {
            select.innerHTML = '<option value="">Select a PC unit...</option>' +
                units.map(u => `<option value="${u.id}">PC #${u.unit_number} - ${u.label || 'Available'}</option>`).join('');
        }
    } catch (error) {
        console.error('Load units error:', error);
    }
}

window.startELibrarySession = async function() {
    const unitId = document.getElementById('unit-select')?.value;
    const purpose = document.getElementById('session-purpose')?.value;
    
    if (!unitId) {
        showToast('Please select a PC unit', 'error');
        return;
    }
    
    showToast('Starting session...', 'info');
    
    try {
        await startSession(parseInt(unitId), purpose || 'General use');
        showToast('Session started successfully!', 'success');
        await loadELibrary();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.endELibrarySession = async function(sessionId) {
    if (!confirm('End this session?')) return;
    
    showToast('Ending session...', 'info');
    
    try {
        await endSession(sessionId);
        showToast('Session ended successfully!', 'success');
        await loadELibrary();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Display available PCs with color-coded status
window.displayAvailablePCs = async function() {
    const container = document.getElementById('available-pcs');
    if (!container) return;
    
    try {
        const units = await fetchELibraryUnits(true);
        const activeSessions = await fetchActiveSessions();
        
        const activeSessMap = {};
        (activeSessions || []).forEach(s => {
            if (!activeSessMap[s.unit_id]) activeSessMap[s.unit_id] = 0;
            activeSessMap[s.unit_id]++;
        });
        
        if (!units || units.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No PC units available</div>';
            return;
        }
        
        container.innerHTML = units.map(unit => {
            const status = activeSessMap[unit.id] > 0 ? 'in-use' : 'available';
            const statusColor = status === 'available' ? '#10b981' : '#f59e0b';
            const statusText = status === 'available' ? '✓ Available' : `In Use (${activeSessMap[unit.id]})`;
            
            return `
                <div style="
                    border: 2px solid ${statusColor};
                    border-radius: 12px;
                    padding: 16px;
                    background: rgba(${statusColor === '#10b981' ? '16,185,129' : '245,158,11'}, 0.08);
                    cursor: pointer;
                    transition: all 0.2s;
                " 
                onmouseover="this.style.transform='translateY(-2px)'" 
                onmouseout="this.style.transform='translateY(0)'">
                    <div style="font-size: 24px; font-weight: 700; color: ${statusColor}; margin-bottom: 8px;">
                        PC #${unit.unit_number || unit.id}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px;">
                        ${unit.label || 'E-Library Unit'}
                    </div>
                    <div style="color: ${statusColor}; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                        ${statusText}
                    </div>
                    <div style="color: var(--text-muted); font-size: 11px; margin-bottom: 12px;">
                        Location: ${unit.location || 'Main Hall'}<br>
                        Condition: ${unit.condition || 'Good'}
                    </div>
                    ${status === 'available' ? `
                        <button class="btn btn-primary" style="width: 100%; padding: 8px; font-size: 12px;" 
                            onclick="selectUnitAndScroll(${unit.id}, '${unit.unit_number || unit.id}')">
                            <i class="fas fa-play"></i> Reserve
                        </button>
                    ` : `
                        <button class="btn" style="width: 100%; padding: 8px; font-size: 12px; background: #94a3b8; cursor: not-allowed;" disabled>
                            In Use
                        </button>
                    `}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Display PCs error:', error);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #f87171;">Failed to load PC units</div>';
    }
};

window.selectUnitAndScroll = function(unitId, unitNumber) {
    const select = document.getElementById('session-unit');
    if (select) {
        select.value = unitId;
        select.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const purposeInput = document.getElementById('session-purpose');
        if (purposeInput) purposeInput.focus();
    }
};

window.refreshAvailablePCs = async function() {
    showToast('Refreshing PC status...', 'info');
    await displayAvailablePCs();
    showToast('PC status updated', 'success');
};

window.refreshELibrary = async function() {
    showToast('Refreshing E-Library data...', 'info');
    await loadELibrary();
};

// ============================================================
// ADMIN: E-LIBRARY MANAGEMENT
// ============================================================

let currentELibraryUnits = [];

async function loadELibraryManagement() {
    if (!isAdmin()) return;
    const tbody = document.getElementById('elibrary-units-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading units...</td></tr>';
    
    try {
        const units = await fetchELibraryUnits(false);
        currentELibraryUnits = units || [];
        
        if (!units || units.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No PC units found. Create one to get started.</td></tr>';
            return;
        }
        
        // Get active sessions count per unit
        const allSessions = await fetchAllSessions(500);
        const activeSessions = (allSessions || []).reduce((acc, s) => {
            if (!s.time_out) {
                acc[s.unit_id] = (acc[s.unit_id] || 0) + 1;
            }
            return acc;
        }, {});
        
        tbody.innerHTML = units.map(unit => `
            <tr>
                <td><strong>PC #${unit.unit_number || unit.id}</strong></td>
                <td>${unit.label || '-'}</td>
                <td>${unit.location || '-'}</td>
                <td><span class="badge ${unit.condition === 'good' ? 'badge-green' : 'badge-yellow'}">${unit.condition || 'good'}</span></td>
                <td><span class="badge ${unit.is_active ? 'badge-green' : 'badge-gray'}">${unit.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><span class="badge badge-blue">${activeSessions[unit.id] || 0}</span></td>
                <td>
                    <button class="btn-small" onclick="editELibraryUnit(${unit.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteELibraryUnit(${unit.id})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load E-Library management error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#f87171;">Failed to load units</td></tr>';
        showToast('Failed to load E-Library units', 'error');
    }
}

window.showAddELibraryUnitModal = function() {
    const form = `
        <div style="padding: 20px;">
            <div class="form-group">
                <label class="form-label">PC Unit Number</label>
                <input type="number" id="unit-number" class="form-input" placeholder="e.g., 1, 2, 3..." min="1">
            </div>
            <div class="form-group">
                <label class="form-label">Label / Name</label>
                <input type="text" id="unit-label" class="form-input" placeholder="e.g., Front Desk PC #1">
            </div>
            <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" id="unit-location" class="form-input" placeholder="e.g., Main Hall, Level 2">
            </div>
            <div class="form-group">
                <label class="form-label">Specifications</label>
                <textarea id="unit-specs" class="form-input" placeholder="e.g., Intel i7, 16GB RAM, Windows 10" style="resize: vertical; min-height: 80px;"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Condition</label>
                <select id="unit-condition" class="form-input">
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="needs_repair">Needs Repair</option>
                </select>
            </div>
        </div>
    `;
    
    // For now, use simple prompt-based approach
    const unitNumber = prompt('Enter PC Unit Number (1-50):');
    if (!unitNumber) return;
    
    const label = prompt('Enter Unit Label (e.g., "Front Desk PC #1"):') || `PC Unit ${unitNumber}`;
    const location = prompt('Enter Location (e.g., "Main Hall, Level 2"):') || 'Main Building';
    const specs = prompt('Enter Specifications (optional):') || '';
    
    createELibraryUnit({
        unit_number: parseInt(unitNumber),
        label,
        location,
        specs: specs || null,
        condition: 'good',
        is_active: true
    });
};

async function createELibraryUnit(unitData) {
    showToast('Creating E-Library unit...', 'info');
    
    try {
        await createELibraryUnit(unitData);
        showToast('PC unit created successfully!', 'success');
        await loadELibraryManagement();
    } catch (error) {
        showToast(error.message || 'Failed to create unit', 'error');
    }
}

window.editELibraryUnit = async function(unitId) {
    const unit = currentELibraryUnits.find(u => u.id === unitId);
    if (!unit) {
        showToast('Unit not found', 'error');
        return;
    }
    
    const newLabel = prompt('Enter new label:', unit.label || '');
    const newLocation = prompt('Enter new location:', unit.location || '');
    const newCondition = prompt('Enter condition (good/fair/needs_repair):', unit.condition || 'good');
    const newStatus = confirm('Should this unit be active?');
    
    if (newLabel || newLocation || newCondition !== undefined) {
        showToast('Updating unit...', 'info');
        
        try {
            await updateELibraryUnit(unitId, {
                label: newLabel || unit.label,
                location: newLocation || unit.location,
                condition: newCondition || unit.condition,
                is_active: newStatus
            });
            showToast('Unit updated successfully!', 'success');
            await loadELibraryManagement();
        } catch (error) {
            showToast(error.message || 'Failed to update unit', 'error');
        }
    }
};

window.deleteELibraryUnit = async function(unitId) {
    if (!confirm('Delete this PC unit? Any active sessions will be ended.')) return;
    
    showToast('Deleting unit...', 'info');
    
    try {
        await deleteELibraryUnit(unitId);
        showToast('PC unit deleted successfully!', 'success');
        await loadELibraryManagement();
    } catch (error) {
        showToast(error.message || 'Failed to delete unit', 'error');
    }
};

// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading profile...</div>';
    
    try {
        const user = await fetchCurrentUser();
        
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User';
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
                <button class="edit-btn" onclick="editProfile()"><i class="fas fa-pen"></i> Edit Info</button>
            </div>
            <div class="card">
                <div class="card-title">Personal Details</div>
                <div class="detail-row"><span class="detail-key">ID Number</span><span class="detail-val">${user.student_id || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Full Name</span><span class="detail-val">${name}</span></div>
                <div class="detail-row"><span class="detail-key">Role</span><span class="detail-val">${role}</span></div>
                <div class="detail-row"><span class="detail-key">Email</span><span class="detail-val">${user.email || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Course</span><span class="detail-val">${user.course || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Year Level</span><span class="detail-val">${user.year_level || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-key">Contact</span><span class="detail-val">${user.contact_number || 'N/A'}</span></div>
            </div>
        `;
    } catch (error) {
        console.error('Load profile error:', error);
        container.innerHTML = '<div class="text-center text-red-400">Failed to load profile</div>';
        showToast('Failed to load profile', 'error');
    }
}

function loadPasswordChange() {
    const container = document.querySelector('#page-password');
    if (!container) return;
    
    // Password change is already in the HTML, just ensure the function exists
}

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
    
    showToast('Changing password...', 'info');
    
    try {
        await changePassword(userId, current, newPass);
        showToast('Password changed successfully!', 'success');
        
        // Clear fields
        if (document.getElementById('current-password')) document.getElementById('current-password').value = '';
        if (document.getElementById('new-password')) document.getElementById('new-password').value = '';
        if (document.getElementById('confirm-password')) document.getElementById('confirm-password').value = '';
    } catch (error) {
        showToast(error.message || 'Failed to change password', 'error');
    }
};

window.editProfile = async function() {
    const course = prompt('Enter your course:', '');
    const year_level = prompt('Enter your year level (1-6):', '');
    const contact = prompt('Enter your contact number:', '');
    
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const updates = {};
    if (course) updates.course = course;
    if (year_level) updates.year_level = parseInt(year_level);
    if (contact) updates.contact_number = contact;
    
    if (Object.keys(updates).length === 0) return;
    
    showToast('Updating profile...', 'info');
    
    try {
        await updateUserProfile(userId, updates);
        showToast('Profile updated successfully!', 'success');
        await loadProfile();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

async function loadManageBooks() {
    if (!isAdmin()) return;
    const tbody = document.getElementById('manage-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading books...</td></tr>';
    
    try {
        const result = await fetchBooks();
        const books = result.books || [];
        
        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>
                    <span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">
                        ${book.available_copies > 0 ? `${book.available_copies}/${book.total_copies} avail` : 'Out of stock'}
                    </span>
                </td>
                <td>
                    <button class="btn-small" onclick="editBook(${book.id})">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteBook(${book.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load manage books error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#f87171;">Failed to load books</td></tr>';
    }
}

async function loadInventory() {
    if (!isAdmin()) return;
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    
    try {
        const result = await fetchBooks();
        const books = result.books || [];
        
        tbody.innerHTML = books.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'Uncategorized'}</td>
                <td>${book.total_copies || 0}</td>
                <td>${book.available_copies || 0}</td>
                <td>
                    <button class="btn-small" onclick="editBook(${book.id})">Edit</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load inventory error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#f87171;">Failed to load inventory</td></tr>';
    }
}

async function loadUserManagement() {
    if (!isAdmin()) return;
    const tbody = document.getElementById('user-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading users...</td></tr>';
    
    try {
        const users = await fetchAllUsers();
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.first_name || ''} ${user.last_name || ''}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.student_id || 'N/A'}</td>
                <td>${user.course || 'N/A'}</td>
                <td><span class="badge ${user.role === 'admin' ? 'badge-red' : 'badge-blue'}">${user.role || 'student'}</span></td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteUserAccount(${user.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load users error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#f87171;">Failed to load users</td></tr>';
    }
}

window.deleteUserAccount = async function(userId) {
    if (!confirm('Delete this user permanently? This action cannot be undone.')) return;
    
    showToast('Deleting user...', 'info');
    
    try {
        await deleteUser(userId);
        showToast('User deleted successfully', 'success');
        await loadUserManagement();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// ============================================================
// EQUIPMENT MAINTENANCE
// ============================================================

async function loadEquipmentMaintenance() {
    if (!isAdmin()) return;
    await loadEquipmentStats();
    await loadDamageReports();
}

async function loadEquipmentStats() {
    try {
        const peripherals = await fetchPeripherals();
        currentEquipment = peripherals;
        
        const total = peripherals.length;
        const good = peripherals.filter(p => p.condition === 'good').length;
        const repair = peripherals.filter(p => p.condition === 'repair_needed' || p.condition === 'damaged').length;
        const categories = new Set(peripherals.map(p => p.category_name).filter(Boolean));
        
        const totalEl = document.getElementById('total-equipment');
        const goodEl = document.getElementById('good-equipment');
        const repairEl = document.getElementById('repair-equipment');
        const categoryEl = document.getElementById('category-count');
        
        if (totalEl) totalEl.textContent = total;
        if (goodEl) goodEl.textContent = good;
        if (repairEl) repairEl.textContent = repair;
        if (categoryEl) categoryEl.textContent = categories.size;
        
        // Render equipment table
        const tbody = document.getElementById('equipment-tbody');
        if (tbody) {
            tbody.innerHTML = peripherals.map(p => `
                <tr>
                    <td>${p.name || 'N/A'}</td>
                    <td>${p.category_name || 'Uncategorized'}</td>
                    <td>${p.brand || '-'} ${p.model || ''}</td>
                    <td>${p.serial_number || '-'}</td>
                    <td>${p.unit_number ? `PC #${p.unit_number}` : '-'}</td>
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
        showToast('Failed to load equipment', 'error');
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
            <td>${p.name || 'N/A'}</td>
            <td>${p.category_name || 'Uncategorized'}</td>
            <td>${p.brand || '-'} ${p.model || ''}</td>
            <td>${p.serial_number || '-'}</td>
            <td>${p.unit_number ? `PC #${p.unit_number}` : '-'}</td>
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
        const stats = await fetchDamageReportStats();
        const totalEl = document.getElementById('total-reports');
        const pendingEl = document.getElementById('pending-reports');
        const resolvedEl = document.getElementById('resolved-reports');
        const criticalEl = document.getElementById('critical-reports');
        
        if (totalEl) totalEl.textContent = stats.total_reports || 0;
        if (pendingEl) pendingEl.textContent = stats.pending || 0;
        if (resolvedEl) resolvedEl.textContent = stats.resolved || 0;
        if (criticalEl) criticalEl.textContent = stats.critical || 0;
        
        const reports = await fetchDamageReports();
        currentDamageReports = reports;
        
        const tbody = document.getElementById('damage-tbody');
        if (tbody) {
            tbody.innerHTML = reports.map(r => `
                <tr>
                    <td>#${r.id}</td>
                    <td>${r.reporter_name || 'Unknown'}</td>
                    <td>${r.peripheral_name || r.peripheral_id || 'N/A'}</td>
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
            <td>${r.peripheral_name || r.peripheral_id || 'N/A'}</td>
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
    showToast('Adding equipment...', 'info');
    
    try {
        await createPeripheral(equipmentData);
        showToast('Equipment added successfully!', 'success');
        await loadEquipmentStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.editEquipment = async function(id) {
    const equipment = currentEquipment.find(e => e.id === id);
    if (!equipment) return;
    
    const newCondition = prompt('Enter new condition (good/damaged/repair_needed):', equipment.condition);
    if (newCondition && ['good', 'damaged', 'repair_needed'].includes(newCondition)) {
        showToast('Updating condition...', 'info');
        
        try {
            await updatePeripheralCondition(id, newCondition);
            showToast('Equipment condition updated', 'success');
            await loadEquipmentStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.deleteEquipment = async function(id) {
    if (!confirm('Delete this equipment? This action cannot be undone.')) return;
    
    showToast('Deleting equipment...', 'info');
    
    try {
        await deletePeripheral(id);
        showToast('Equipment deleted', 'success');
        await loadEquipmentStats();
    } catch (error) {
        showToast(error.message, 'error');
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
    showToast('Submitting damage report...', 'info');
    
    try {
        await createDamageReport(reportData);
        showToast('Damage report submitted', 'success');
        await loadDamageReports();
        await loadEquipmentStats();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.resolveDamage = async function(id) {
    const notes = prompt('Enter resolution notes:');
    if (notes) {
        showToast('Resolving report...', 'info');
        
        try {
            await resolveDamageReport(id, notes);
            showToast('Damage report resolved', 'success');
            await loadDamageReports();
            await loadEquipmentStats();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.viewDamageDetails = async function(id) {
    try {
        const report = await fetchDamageReportById(id);
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

// Export functions for global use
window.filterBooks = filterBooks;
window.loadAllData = function() {
    updateUserInterface();
    loadDashboard();
};

// Book management functions
window.editBook = async function(bookId) {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
        try {
            await updateBook(bookId, { title: newTitle });
            showToast('Book updated', 'success');
            await loadManageBooks();
            await loadInventory();
            await loadCatalog();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

window.deleteBook = async function(bookId) {
    if (!confirm('Delete this book permanently?')) return;
    
    showToast('Deleting book...', 'info');
    
    try {
        await deleteBook(bookId);
        showToast('Book deleted', 'success');
        await loadManageBooks();
        await loadInventory();
        await loadCatalog();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.showAddBookModal = function() {
    const isbn = prompt('Enter ISBN:');
    const title = prompt('Enter book title:');
    const author = prompt('Enter author:');
    const category = prompt('Enter category ID (1-10):', '1');
    const totalCopies = prompt('Enter number of copies:', '1');
    
    if (isbn && title && author && category && totalCopies) {
        createBook({
            isbn,
            title,
            author,
            category_id: parseInt(category),
            total_copies: parseInt(totalCopies),
            description: '',
        }).catch(error => showToast(error.message, 'error'));
    }
};

async function createBook(bookData) {
    showToast('Adding book...', 'info');
    
    try {
        await createBook(bookData);
        showToast('Book added successfully!', 'success');
        await loadManageBooks();
        await loadInventory();
        await loadCatalog();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.exportToPDF = function() {
    showToast('PDF export feature coming soon', 'info');
};

console.log('✅ App initialized');