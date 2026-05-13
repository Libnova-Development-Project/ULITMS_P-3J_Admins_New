// Dynamic Sidebar Loading Based on User Role
function updateUserInfo() {
    const name = localStorage.getItem('ulitms_name');
    const role = localStorage.getItem('ulitms_role') || 'visitor';
    const avatarUrl = localStorage.getItem('ulitms_avatar');
    
    // Fallback if name is missing
    const displayName = (name && name !== 'undefined' && name !== 'null') ? name : 'User';
    const initials = displayName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    
    const updateAvatar = (el) => {
        if (!el) return;
        if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined' && avatarUrl !== '') {
            el.style.backgroundImage = `url(${window.location.origin}${avatarUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.textContent = '';
        } else {
            el.style.backgroundImage = 'none';
            el.textContent = initials;
        }
    };

    // Sidebar elements
    updateAvatar(document.getElementById('sidebar-avatar'));
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarRole = document.getElementById('sidebar-role');
    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
    
    // Header elements (Top bar)
    updateAvatar(document.getElementById('header-avatar'));
    const headerName = document.getElementById('header-name');
    const headerRole = document.getElementById('header-role');
    if (headerName) headerName.textContent = displayName;
    if (headerRole) headerRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
}

async function loadNotifications() {
    const notifBtn = document.querySelector('.notif-btn');
    if (!notifBtn) return;

    // Add badge if not exists
    let badge = notifBtn.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.display = 'none';
        notifBtn.appendChild(badge);
    }

    try {
        const response = await fetch(`${window.location.origin}/api/notifications`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token') }
        });
        const data = await response.json();
        
        if (data.success) {
            const count = data.unreadCount;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
            
            // Store notifications for dropdown
            window.notifications = data.notifications;
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function toggleNotifications() {
    let dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'notification-dropdown'; // Class from styles.css
        document.querySelector('.topbar-right').appendChild(dropdown);
    }

    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
    }

    const notifs = window.notifications || [];
    dropdown.innerHTML = `
        <div class="notification-header">
            <span>Notifications</span>
            <span class="mark-read-btn" onclick="markAllRead()">Mark all as read</span>
        </div>
        <div class="notification-list">
            ${notifs.length === 0 ? '<div class="notification-item" style="text-align:center;padding:20px;color:var(--text-muted);">No new notifications</div>' : 
                notifs.map(n => `
                <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markAsRead(${n.id})">
                    <div style="display: flex; gap: 12px;">
                        <div class="notif-icon-circle" style="width:32px;height:32px;border-radius:50%;background:rgba(39, 196, 204, 0.1);display:flex;align-items:center;justify-content:center;color:var(--teal-primary);">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div style="flex: 1;">
                            <div class="notification-title">${n.title}</div>
                            <div class="notification-message">${n.message}</div>
                            <div class="notification-time">${new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    dropdown.style.display = 'block';
}

async function markAsRead(id) {
    try {
        await fetch(`${window.location.origin}/api/notifications/${id}/mark-read`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token') }
        });
        loadNotifications();
        // Keep dropdown open but update
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    } catch (error) {
        console.error(error);
    }
}

async function markAllRead() {
    try {
        await fetch(`${window.location.origin}/api/notifications/mark-all-read`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token') }
        });
        loadNotifications();
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    } catch (error) {
        console.error(error);
    }
}

// Global click handler to close dropdown
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const notifBtn = document.querySelector('.notif-btn');
    if (dropdown && !dropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

function initHeader() {
    const notifBtn = document.querySelector('.notif-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', toggleNotifications);
        loadNotifications();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateUserInfo();
    initHeader();
});

function checkAuth() {
    if (!localStorage.getItem('ulitms_token')) {
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('ulitms_token');
    localStorage.removeItem('ulitms_user_id');
    localStorage.removeItem('ulitms_name');
    localStorage.removeItem('ulitms_role');
    localStorage.removeItem('ulitms_email');
    window.location.href = '../login.html';
}

function loadSidebar() {
    const role = localStorage.getItem('ulitms_role');
    const sidebar = document.getElementById('sidebar');
    
    if (role === 'admin') {
        // Load admin sidebar
        loadAdminSidebar(sidebar);
    } else {
        // Load user sidebar
        loadUserSidebar(sidebar);
    }
}

function loadAdminSidebar(sidebar) {
    sidebar.innerHTML = `
        <div class="logo-area">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="logo-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--teal-primary), var(--teal-dark)); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #0b1120; font-size: 1.2rem; box-shadow: 0 4px 12px rgba(39, 196, 204, 0.3);">
                    <i class="fas fa-university"></i>
                </div>
                <div>
                    <div class="logo-title">ULITMS</div>
                    <div class="logo-sub">Library Management System</div>
                </div>
            </div>
        </div>
        <nav class="nav-section">
            <!-- Main Menu -->
            <div class="nav-label">Main Menu</div>
            <a href="dashboard.html" class="nav-item">
                <span class="icon" style="color: #60a5fa;"><i class="fas fa-chart-line"></i></span>
                <span>Admin Dashboard</span>
            </a>
            
            <!-- Admin Panel -->
            <div class="nav-divider"></div>
            <div class="nav-label">Management</div>
            <a href="manage-books.html" class="nav-item">
                <span class="icon" style="color: #34d399;"><i class="fas fa-book-open"></i></span>
                <span>Manage Books</span>
            </a>
            <a href="manage-users.html" class="nav-item">
                <span class="icon" style="color: #f472b6;"><i class="fas fa-user-shield"></i></span>
                <span>Manage Users</span>
            </a>
            <a href="manage-equipment.html" class="nav-item">
                <span class="icon" style="color: #fbbf24;"><i class="fas fa-desktop"></i></span>
                <span>Hardware Management</span>
            </a>
            <a href="damage-reports.html" class="nav-item">
                <span class="icon" style="color: #f87171;"><i class="fas fa-tools"></i></span>
                <span>Damage Reports</span>
            </a>
            <a href="system-settings.html" class="nav-item">
                <span class="icon" style="color: #a78bfa;"><i class="fas fa-sliders-h"></i></span>
                <span>System Settings</span>
            </a>
            
            <!-- Account Section -->
            <div class="nav-divider"></div>
            <div class="nav-label">Account</div>
            <a href="profile.html" class="nav-item">
                <span class="icon" style="color: #94a3b8;"><i class="fas fa-id-card"></i></span>
                <span>My Profile</span>
            </a>
            <a href="password.html" class="nav-item">
                <span class="icon" style="color: #94a3b8;"><i class="fas fa-key"></i></span>
                <span>Change Password</span>
            </a>
            <div class="nav-divider"></div>
            <a href="javascript:void(0)" onclick="logout()" class="nav-item" style="color:#f87171;">
                <span class="icon"><i class="fas fa-power-off"></i></span>
                <span>Logout</span>
            </a>
        </nav>
        <div class="user-footer">
            <div class="avatar" id="sidebar-avatar">G</div>
            <div>
                <div class="user-name" id="sidebar-name">Guest</div>
                <div class="user-role" id="sidebar-role">Administrator</div>
            </div>
        </div>
    `;
    
    // Set active page highlighting
    setActiveNavItem();
    updateUserInfo();
}

function loadUserSidebar(sidebar) {
    sidebar.innerHTML = `
        <div class="logo-area">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="logo-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--teal-primary), var(--teal-dark)); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #0b1120; font-size: 1.2rem; box-shadow: 0 4px 12px rgba(39, 196, 204, 0.3);">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <div>
                    <div class="logo-title">ULITMS</div>
                    <div class="logo-sub">Library Management System</div>
                </div>
            </div>
        </div>
        <nav class="nav-section">
            <!-- Main Menu -->
            <div class="nav-label">Main Menu</div>
            <a href="dashboard.html" class="nav-item">
                <span class="icon" style="color: #60a5fa;"><i class="fas fa-th-large"></i></span>
                <span>Dashboard</span>
            </a>
            <a href="catalog.html" class="nav-item">
                <span class="icon" style="color: #34d399;"><i class="fas fa-book"></i></span>
                <span>Book Catalog</span>
            </a>
            <a href="borrowings.html" class="nav-item">
                <span class="icon" style="color: #f472b6;"><i class="fas fa-bookmark"></i></span>
                <span>My Borrowings</span>
            </a>
            <a href="elibrary.html" class="nav-item">
                <span class="icon" style="color: #fbbf24;"><i class="fas fa-desktop"></i></span>
                <span>E-Library</span>
            </a>
            
            <!-- Account Section -->
            <div class="nav-divider"></div>
            <div class="nav-label">Account</div>
            <a href="profile.html" class="nav-item">
                <span class="icon"><i class="fas fa-user"></i></span>
                <span>My Profile</span>
            </a>
            <a href="password.html" class="nav-item">
                <span class="icon"><i class="fas fa-lock"></i></span>
                <span>Change Password</span>
            </a>
            <div class="nav-divider"></div>
            <a href="javascript:void(0)" onclick="logout()" class="nav-item" style="color:#f87171;">
                <span class="icon"><i class="fas fa-sign-out-alt"></i></span>
                <span>Logout</span>
            </a>
        </nav>
        <div class="user-footer">
            <div class="avatar" id="sidebar-avatar">G</div>
            <div>
                <div class="user-name" id="sidebar-name">Guest</div>
                <div class="user-role" id="sidebar-role">Student</div>
            </div>
        </div>
    `;
    
    // Set active page highlighting
    setActiveNavItem();
    updateUserInfo();
}

function setActiveNavItem() {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const navItems = document.querySelectorAll('.nav-item');
    
    // Remove active class from all items
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to current page item
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentPage + '.html') {
            item.classList.add('active');
        }
    });
}
