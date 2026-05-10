// Main application logic
(function(){
  let books = JSON.parse(localStorage.getItem('ulitms_books') || '[]');
  let accounts = JSON.parse(localStorage.getItem('ulitms_accounts') || '[]');
  let borrowings = JSON.parse(localStorage.getItem('ulitms_borrowings') || '[]');
  let sessions = JSON.parse(localStorage.getItem('ulitms_sessions') || '[]');
  
  // Function to get current user from localStorage
  function getCurrentUser() {
    return {
      role: localStorage.getItem('ulitms_role'),
      name: localStorage.getItem('ulitms_name'),
      email: localStorage.getItem('ulitms_email'),
      studentId: localStorage.getItem('ulitms_studentid'),
      course: localStorage.getItem('ulitms_course'),
      year: localStorage.getItem('ulitms_year'),
      contact: localStorage.getItem('ulitms_contact')
    };
  }

  let currentUser = getCurrentUser();

  // Refresh current user
  function refreshCurrentUser() {
    currentUser = getCurrentUser();
  }

  // Navigation pages
  const pages = {
    dashboard: { id: 'page-dashboard', title: 'Dashboard' },
    catalog: { id: 'page-catalog', title: 'Book Catalog' },
    manage: { id: 'page-manage', title: 'Manage Books' },
    inventory: { id: 'page-inventory', title: 'Book Inventory' },
    elibraryLogs: { id: 'page-elibraryLogs', title: 'E-Library Logs' },
    userManagement: { id: 'page-userManagement', title: 'User Management' },
    borrowings: { id: 'page-borrowings', title: 'My Borrowings' },
    elibrary: { id: 'page-elibrary', title: 'E-Library' },
    profile: { id: 'page-profile', title: 'My Profile' },
    password: { id: 'page-password', title: 'Change Password' }
  };

  // Show/Hide menu items based on role
  function showUserMenu() {
    console.log('Showing menu for role:', currentUser.role);
    
    // Get all nav items
    const allNavItems = document.querySelectorAll('.nav-item[data-page]');
    
    // First hide all role-specific items
    document.querySelectorAll('.user-only').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
    
    // Show based on role
    if (currentUser.role === 'user') {
      document.querySelectorAll('.user-only').forEach(el => {
        el.style.display = 'flex';
        console.log('Showing user menu:', el.getAttribute('data-page'));
      });
    } else if (currentUser.role === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'flex';
        console.log('Showing admin menu:', el.getAttribute('data-page'));
      });
    }
    
    // Dashboard and Account pages are always visible (no class)
    console.log('Menu updated for role:', currentUser.role);
  }

  window.navigate = function(key) {
    Object.values(pages).forEach(p => {
      const el = document.getElementById(p.id);
      if (el) el.classList.remove('active');
    });
    const target = document.getElementById(pages[key].id);
    if (target) target.classList.add('active');
    document.getElementById('topbar-title').textContent = pages[key].title;
    document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${key}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    // Load data based on page
    if (key === 'manage') loadManageBooks();
    if (key === 'inventory') loadInventory();
    if (key === 'userManagement') loadUserManagement();
    if (key === 'elibraryLogs') loadAdminSessions();
    if (key === 'catalog') renderCatalog();
    if (key === 'borrowings') renderBorrowings();
    if (key === 'elibrary') renderElibrary();
    if (key === 'profile') renderProfile();
  };

  // Set up navigation event listeners
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

  function saveBooks() { localStorage.setItem('ulitms_books', JSON.stringify(books)); }

  // Dashboard
  function renderDashboard() {
    const statsDiv = document.getElementById('dashboard-stats');
    const welcomeSpan = document.getElementById('dashboard-welcome');
    const subSpan = document.getElementById('dashboard-sub');
    
    refreshCurrentUser();
    
    if (currentUser.role === 'admin') {
      welcomeSpan.innerHTML = `Welcome, Admin ${currentUser.name}! 👑`;
      subSpan.innerHTML = 'System overview & management dashboard';
      statsDiv.innerHTML = `
        <div class="stat-card"><div class="label">Total Books</div><div class="value">${books.length}</div></div>
        <div class="stat-card"><div class="label">Total Users</div><div class="value">${accounts.filter(a => a.role === 'user').length}</div></div>
        <div class="stat-card"><div class="label">Active Borrowings</div><div class="value">${borrowings.filter(b => b.status !== 'Returned').length}</div></div>
      `;
      document.getElementById('dashboard-recent').innerHTML = `<div class="card-title">Admin Actions</div><div class="activity-text">📊 Manage books, users, and monitor E-Library usage from the sidebar.</div>`;
    } else {
      welcomeSpan.innerHTML = `Welcome back, ${currentUser.name}! 👋`;
      subSpan.innerHTML = "Here's your library summary for today";
      const userBorrowings = borrowings.filter(b => b.userId === currentUser.studentId || b.userEmail === currentUser.email);
      const userSessions = sessions.filter(s => s.userEmail === currentUser.email);
      statsDiv.innerHTML = `
        <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${userBorrowings.filter(b => b.status !== 'Returned').length}</div></div>
        <div class="stat-card"><div class="label">Total Sessions</div><div class="value">${userSessions.length}</div></div>
        <div class="stat-card"><div class="label">Books Available</div><div class="value">${books.filter(b => b.status === 'Available').length}</div></div>
      `;
      document.getElementById('dashboard-recent').innerHTML = `<div class="card-title">Recent Activity</div><div class="activity-text">📖 You have ${userBorrowings.filter(b => b.status === 'Due Soon').length} book(s) due soon. Visit Book Catalog to browse available books.</div>`;
    }
    document.getElementById('dashboard-alert').innerHTML = `<div class="alert-box"><div class="alert-icon"><i class="fas fa-info-circle"></i></div><div class="alert-text">Library hours: Mon-Fri 8AM - 8PM | Sat 9AM - 5PM</div></div>`;
  }

  // Catalog (User)
  function renderCatalog() {
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    tbody.innerHTML = books.map(book => `
      <tr>
        <td>${book.isbn}</td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td><span class="badge ${book.status === 'Available' ? 'badge-green' : 'badge-red'}">${book.status}</span></td>
      </tr>
    `).join('');
    
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
      searchInput.removeEventListener('input', catalogSearchHandler);
      searchInput.addEventListener('input', catalogSearchHandler);
    }
  }
  
  function catalogSearchHandler(e) {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('#catalog-tbody tr').forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(search) ? '' : 'none';
    });
  }

  // Manage Books (Admin CRUD)
  window.loadManageBooks = function() {
    const tbody = document.getElementById('manage-tbody');
    if (!tbody) return;
    tbody.innerHTML = books.map((book, idx) => `
      <tr>
        <td>${book.isbn}</td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td><select class="form-input" style="width:120px" onchange="updateBookStatus(${idx}, this.value)"><option ${book.status === 'Available' ? 'selected' : ''}>Available</option><option ${book.status === 'Borrowed' ? 'selected' : ''}>Borrowed</option></select></td>
        <td><button class="btn-small" onclick="editBook(${idx})">Edit</button><button class="btn-small btn-danger" onclick="deleteBook(${idx})">Delete</button></td>
      </tr>
    `).join('');
  };

  window.updateBookStatus = function(index, newStatus) {
    books[index].status = newStatus;
    saveBooks();
    loadManageBooks();
    loadInventory();
    renderCatalog();
  };

  window.editBook = function(index) {
    const newTitle = prompt('Enter new title:', books[index].title);
    if (newTitle) books[index].title = newTitle;
    const newAuthor = prompt('Enter new author:', books[index].author);
    if (newAuthor) books[index].author = newAuthor;
    saveBooks();
    loadManageBooks();
    loadInventory();
    renderCatalog();
  };

  window.deleteBook = function(index) {
    if (confirm('Delete this book permanently?')) {
      books.splice(index, 1);
      saveBooks();
      loadManageBooks();
      loadInventory();
      renderCatalog();
    }
  };

  window.showAddBookModal = function() {
    const isbn = prompt('Enter ISBN:');
    const title = prompt('Enter book title:');
    const author = prompt('Enter author:');
    const category = prompt('Enter category:');
    if (isbn && title && author && category) {
      books.push({ isbn, title, author, category, status: 'Available' });
      saveBooks();
      loadManageBooks();
      loadInventory();
      renderCatalog();
      alert('Book added successfully!');
    }
  };

  window.exportToPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('ULITMS - Book Catalog', 20, 20);
    let y = 40;
    books.forEach(book => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${book.isbn} | ${book.title} | ${book.author} | ${book.status}`, 20, y);
      y += 10;
    });
    doc.save('library_catalog.pdf');
  };

  function loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = books.map(book => `
      <tr>
        <td>${book.isbn}</td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td><span class="badge ${book.status === 'Available' ? 'badge-green' : 'badge-red'}">${book.status}</span></td>
        <td><button class="btn-small" onclick="alert('Go to Manage Books to edit')">View</button></td>
      </tr>
    `).join('');
  }

  function loadUserManagement() {
    const tbody = document.getElementById('user-tbody');
    if (!tbody) return;
    const regularUsers = accounts.filter(a => a.role === 'user');
    tbody.innerHTML = regularUsers.map(user => `
      <tr>
        <td>${user.fullname}</td>
        <td>${user.email}</td>
        <td>${user.studentId}</td>
        <td>${user.course}</td>
        <td>User</td>
        <td><button class="btn-small btn-danger" onclick="deleteUser('${user.email}')">Remove</button></td>
      </tr>
    `).join('');
  }

  window.deleteUser = function(email) {
    if (confirm('Delete this user permanently?')) {
      const index = accounts.findIndex(a => a.email === email);
      if (index !== -1) accounts.splice(index, 1);
      localStorage.setItem('ulitms_accounts', JSON.stringify(accounts));
      loadUserManagement();
      renderDashboard();
      alert('User deleted successfully');
    }
  };

  function loadAdminSessions() {
    const tbody = document.getElementById('admin-session-tbody');
    if (!tbody) return;
    tbody.innerHTML = sessions.map(s => `
      <tr>
        <td>${s.userEmail}</td>
        <td>${s.station}</td>
        <td>${s.date}</td>
        <td>${s.timeIn}</td>
        <td>${s.timeOut}</td>
        <td><span class="badge badge-teal">${s.status}</span></td>
      </tr>
    `).join('');
  }

  function renderBorrowings() {
    const tbody = document.getElementById('borrow-tbody');
    if (!tbody) return;
    const userBorrowings = borrowings.filter(b => b.userId === currentUser.studentId || b.userEmail === currentUser.email);
    tbody.innerHTML = userBorrowings.map(b => `
      <tr>
        <td style="color:#27c4cc">${b.id}</td>
        <td>${b.bookTitle}</td>
        <td>${b.borrowDate}</td>
        <td>${b.dueDate}</td>
        <td><span class="badge badge-yellow">${b.status}</span></td>
      </tr>
    `).join('');
    document.getElementById('borrow-stats').innerHTML = `
      <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${userBorrowings.filter(b => b.status !== 'Returned').length}</div></div>
      <div class="stat-card"><div class="label">Total Borrowed</div><div class="value">${userBorrowings.length}</div></div>
      <div class="stat-card"><div class="label">Overdue Fines</div><div class="value">₱0</div></div>
    `;
  }

  function renderElibrary() {
    const tbody = document.getElementById('elib-tbody');
    if (!tbody) return;
    const userSessions = sessions.filter(s => s.userEmail === currentUser.email);
    tbody.innerHTML = userSessions.map(s => `
      <tr>
        <td>${s.date}</td>
        <td>${s.station}</td>
        <td>${s.timeIn}</td>
        <td>${s.timeOut}</td>
        <td>${s.duration}</td>
        <td><span class="badge ${s.status === 'In Use' ? 'badge-teal' : 'badge-gray'}">${s.status}</span></td>
      </tr>
    `).join('');
    document.getElementById('elib-stats').innerHTML = `
      <div class="stat-card"><div class="label">Total Sessions</div><div class="value">${userSessions.length}</div></div>
      <div class="stat-card"><div class="label">Total Hours</div><div class="value">14h</div></div>
      <div class="stat-card"><div class="label">This Month</div><div class="value">${userSessions.filter(s => s.date.includes('May')).length}</div></div>
    `;
  }

  function renderProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;
    refreshCurrentUser();
    container.innerHTML = `
      <div class="profile-header"><div class="profile-avatar">${(currentUser.name?.charAt(0) || 'U')}</div><div><div class="profile-name">${currentUser.name}</div><div class="profile-meta">${currentUser.studentId || 'N/A'} · ${currentUser.role === 'admin' ? 'Administrator' : 'Student'}</div><div><span class="badge badge-green">Active</span></div></div></div>
      <div class="card"><div class="card-title">Personal Details</div>
        <div class="detail-row"><span class="detail-key">ID Number</span><span class="detail-val">${currentUser.studentId || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-key">Full Name</span><span class="detail-val">${currentUser.name}</span></div>
        <div class="detail-row"><span class="detail-key">Role</span><span class="detail-val">${currentUser.role === 'admin' ? 'Administrator' : 'Student'}</span></div>
        <div class="detail-row"><span class="detail-key">Email</span><span class="detail-val">${currentUser.email}</span></div>
        <div class="detail-row"><span class="detail-key">Course</span><span class="detail-val">${currentUser.course || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-key">Year Level</span><span class="detail-val">${currentUser.year || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-key">Contact</span><span class="detail-val">${currentUser.contact || 'N/A'}</span></div>
      </div>
    `;
  }

  window.changePassword = function() {
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    
    const userAccount = accounts.find(a => a.email === currentUser.email);
    if (!userAccount || userAccount.password !== current) {
      alert('Current password is incorrect');
      return;
    }
    if (newPass !== confirm) {
      alert('New passwords do not match');
      return;
    }
    if (newPass.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    userAccount.password = newPass;
    localStorage.setItem('ulitms_accounts', JSON.stringify(accounts));
    alert('Password changed successfully!');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
  };

  window.loadAllData = function() {
    refreshCurrentUser();
    books = JSON.parse(localStorage.getItem('ulitms_books') || '[]');
    accounts = JSON.parse(localStorage.getItem('ulitms_accounts') || '[]');
    
    console.log('Loading data for role:', currentUser.role);
    
    // Show/hide menu items based on role
    showUserMenu();
    
    // Setup navigation
    setupNavigation();
    
    // Render all pages
    renderDashboard();
    renderCatalog();
    renderBorrowings();
    renderElibrary();
    renderProfile();
    
    if (currentUser.role === 'admin') {
      loadManageBooks();
      loadInventory();
      loadUserManagement();
      loadAdminSessions();
    }
    
    console.log('Data loaded successfully');
  };

  // Expose functions globally
  window.showUserMenu = showUserMenu;
  window.refreshCurrentUser = refreshCurrentUser;
  window.getCurrentUser = getCurrentUser;
  window.setupNavigation = setupNavigation;

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (localStorage.getItem('ulitms_role')) {
        window.loadAllData();
      }
    }, 100);
  });
})();