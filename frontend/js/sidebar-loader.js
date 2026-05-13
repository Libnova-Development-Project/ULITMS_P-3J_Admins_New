// Dynamic Sidebar Loading Based on User Role
function updateUserInfo() {
    const name = localStorage.getItem('ulitms_name') || 'Guest';
    const role = localStorage.getItem('ulitms_role') || 'visitor';
    const initials = name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarRole = document.getElementById('sidebar-role');
    const headerAvatar = document.getElementById('header-avatar');
    const headerName = document.getElementById('header-name');
    const headerRole = document.getElementById('header-role');

    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
    if (headerAvatar) headerAvatar.textContent = initials;
    if (headerName) headerName.textContent = name;
    if (headerRole) headerRole.textContent = role === 'admin' ? 'Administrator' : 'Student';
}

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
            <div class="logo-title">ULITMS</div>
            <div class="logo-sub">Library Management System</div>
        </div>
        <nav class="nav-section">
            <!-- Main Menu -->
            <div class="nav-label">Main Menu</div>
            <a href="dashboard.html" class="nav-item">
                <span class="icon"><i class="fas fa-th-large"></i></span>
                <span>Dashboard</span>
            </a>
            <a href="catalog.html" class="nav-item">
                <span class="icon"><i class="fas fa-book"></i></span>
                <span>Book Catalog</span>
            </a>
            <a href="borrowings.html" class="nav-item">
                <span class="icon"><i class="fas fa-bookmark"></i></span>
                <span>My Borrowings</span>
            </a>
            <a href="elibrary.html" class="nav-item">
                <span class="icon"><i class="fas fa-desktop"></i></span>
                <span>E-Library</span>
            </a>
            
            <!-- Admin Panel -->
            <div class="nav-divider"></div>
            <div class="nav-label">Admin Panel</div>
            <a href="manage-books.html" class="nav-item">
                <span class="icon"><i class="fas fa-book"></i></span>
                <span>Manage Books</span>
            </a>
            <a href="manage-users.html" class="nav-item">
                <span class="icon"><i class="fas fa-users"></i></span>
                <span>Manage Users</span>
            </a>
            <a href="manage-equipment.html" class="nav-item">
                <span class="icon"><i class="fas fa-laptop"></i></span>
                <span>Hardware Management</span>
            </a>
            <a href="damage-reports.html" class="nav-item">
                <span class="icon"><i class="fas fa-exclamation-triangle"></i></span>
                <span>Damage Reports</span>
            </a>
            <a href="system-settings.html" class="nav-item">
                <span class="icon"><i class="fas fa-cog"></i></span>
                <span>System Settings</span>
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
            <div class="logo-title">ULITMS</div>
            <div class="logo-sub">Library Management System</div>
        </div>
        <nav class="nav-section">
            <!-- Main Menu -->
            <div class="nav-label">Main Menu</div>
            <a href="dashboard.html" class="nav-item">
                <span class="icon"><i class="fas fa-th-large"></i></span>
                <span>Dashboard</span>
            </a>
            <a href="catalog.html" class="nav-item">
                <span class="icon"><i class="fas fa-book"></i></span>
                <span>Book Catalog</span>
            </a>
            <a href="borrowings.html" class="nav-item">
                <span class="icon"><i class="fas fa-bookmark"></i></span>
                <span>My Borrowings</span>
            </a>
            <a href="elibrary.html" class="nav-item">
                <span class="icon"><i class="fas fa-desktop"></i></span>
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
