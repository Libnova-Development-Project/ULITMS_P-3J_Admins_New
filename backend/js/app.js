(function() {
    let currentUser = null;
    let booksCache = [];

    // Get current user from localStorage (from auth)
    function getCurrentUser() {
        return {
            id: localStorage.getItem('ulitms_userId'),
            role: localStorage.getItem('ulitms_role'),
            name: localStorage.getItem('ulitms_name'),
            email: localStorage.getItem('ulitms_email'),
            studentId: localStorage.getItem('ulitms_studentid')
        };
    }

    // Navigation pages
    const pages = {
        dashboard: { id: 'page-dashboard', title: 'Dashboard' },
        catalog: { id: 'page-catalog', title: 'Book Catalog' },
        manage: { id: 'page-manage', title: 'Manage Books' },
        inventory: { id: 'page-inventory', title: 'Book Inventory' },
        elibraryLogs: { id: 'page-elibraryLogs', title: 'E-Library Logs' },
        userManagement: { id: 'page-userManagement', title: 'User Management' },
        equipmentMaintenance: { id: 'page-equipmentMaintenance', title: 'Equipment & Maintenance' },
        borrowings: { id: 'page-borrowings', title: 'My Borrowings' },
        elibrary: { id: 'page-elibrary', title: 'E-Library' },
        profile: { id: 'page-profile', title: 'My Profile' },
        password: { id: 'page-password', title: 'Change Password' }
    };

    // Show/hide menu items based on role
    function showUserMenu() {
        const role = getCurrentUser().role;
        console.log('Showing menu for role:', role);
        
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = role === 'user' ? 'flex' : 'none';
        });
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = role === 'admin' ? 'flex' : 'none';
        });
    }

    // Navigation
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
        if (key === 'equipmentMaintenance') {
            renderEquipment();
            renderDamageReports();
            setupMaintenanceSearch();
        }
    };

    // ========== DASHBOARD ==========
    async function renderDashboard() {
        const statsDiv = document.getElementById('dashboard-stats');
        const welcomeSpan = document.getElementById('dashboard-welcome');
        const subSpan = document.getElementById('dashboard-sub');
        
        const currentUser = getCurrentUser();
        
        if (currentUser.role === 'admin') {
            welcomeSpan.innerHTML = `Welcome, Admin ${currentUser.name}! 👑`;
            subSpan.innerHTML = 'System overview & management dashboard';
            
            try {
                const books = await api.getBooks();
                const users = await api.getUsers();
                const borrowings = await api.getAllBorrowings();
                
                statsDiv.innerHTML = `
                    <div class="stat-card"><div class="label">Total Books</div><div class="value">${books.total || 0}</div></div>
                    <div class="stat-card"><div class="label">Total Users</div><div class="value">${users.count || 0}</div></div>
                    <div class="stat-card"><div class="label">Active Borrowings</div><div class="value">${borrowings.borrowings?.filter(b => b.status === 'borrowed').length || 0}</div></div>
                `;
            } catch (error) {
                console.error('Error loading admin dashboard:', error);
                statsDiv.innerHTML = `<div class="stat-card"><div class="label">Error loading data</div><div class="value">-</div></div>`;
            }
            document.getElementById('dashboard-recent').innerHTML = `<div class="card-title">Admin Actions</div><div class="activity-text">📊 Manage books, users, and monitor E-Library usage from the sidebar.</div>`;
        } else {
            welcomeSpan.innerHTML = `Welcome back, ${currentUser.name}! 👋`;
            subSpan.innerHTML = "Here's your library summary for today";
            
            try {
                const borrowings = await api.getUserBorrowings(currentUser.id);
                const sessions = await api.getUserElibrarySessions(currentUser.id);
                
                statsDiv.innerHTML = `
                    <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${borrowings.borrowings?.filter(b => b.status === 'borrowed').length || 0}</div></div>
                    <div class="stat-card"><div class="label">Total Sessions</div><div class="value">${sessions.count || 0}</div></div>
                `;
            } catch (error) {
                console.error('Error loading user dashboard:', error);
            }
            document.getElementById('dashboard-recent').innerHTML = `<div class="card-title">Recent Activity</div><div class="activity-text">📖 Visit Book Catalog to browse available books.</div>`;
        }
        document.getElementById('dashboard-alert').innerHTML = `<div class="alert-box"><div class="alert-icon"><i class="fas fa-info-circle"></i></div><div class="alert-text">Library hours: Mon-Fri 8AM - 8PM | Sat 9AM - 5PM</div></div>`;
    }

    // ========== BOOK CATALOG ==========
    let currentCategory = 'all';
    let allBooksData = [];

    async function renderCatalog() {
        try {
            const result = await api.getBooks({ limit: 500 });
            allBooksData = result.books || [];
            filterBooks(currentCategory);
        } catch (error) {
            console.error('Error loading catalog:', error);
            document.getElementById('catalog-tbody').innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px;">Error loading books</td></tr>`;
        }
    }

    window.filterBooks = async function(category) {
        currentCategory = category;
        
        // Update button styles
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.category === category) {
                btn.style.background = 'rgba(12,168,177,.3)';
                btn.style.border = '1px solid rgba(12,168,177,.6)';
                btn.style.color = '#6adde2';
            } else {
                btn.style.background = 'rgba(12,168,177,.1)';
                btn.style.border = '1px solid rgba(12,168,177,.2)';
                btn.style.color = '#94a3b8';
            }
        });
        
        let filteredBooks = allBooksData;
        if (category !== 'all') {
            filteredBooks = allBooksData.filter(book => book.category === category);
        }
        
        const bookCountSpan = document.getElementById('book-count');
        if (bookCountSpan) {
            bookCountSpan.textContent = `Showing ${filteredBooks.length} books`;
        }
        
        const tbody = document.getElementById('catalog-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = filteredBooks.map(book => `
            <tr>
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>${book.category_name || book.category || 'General'}</td>
                <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">${book.available_copies > 0 ? 'Available' : 'Borrowed'}</span></td>
            </tr>
        `).join('');
    };

    // ========== MANAGE BOOKS (ADMIN CRUD) ==========
    async function loadManageBooks() {
        try {
            const result = await api.getBooks({ limit: 500 });
            const books = result.books || [];
            const tbody = document.getElementById('manage-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = books.map((book, idx) => `
                <tr>
                    <td>${book.isbn || 'N/A'}</td>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category_name || book.category || 'General'}</td>
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
            console.error('Error loading manage books:', error);
        }
    }

    window.updateBookStatus = async function(bookId, newStatus) {
        try {
            await api.updateBook(bookId, { 
                available_copies: newStatus === 'Available' ? 1 : 0 
            });
            loadManageBooks();
            loadInventory();
            renderCatalog();
            alert('Book status updated!');
        } catch (error) {
            console.error('Error updating book status:', error);
            alert('Failed to update status');
        }
    };

    window.editBook = async function(bookId) {
        const newTitle = prompt('Enter new title:');
        if (!newTitle) return;
        
        try {
            await api.updateBook(bookId, { title: newTitle });
            loadManageBooks();
            loadInventory();
            renderCatalog();
            alert('Book updated!');
        } catch (error) {
            console.error('Error editing book:', error);
            alert('Failed to update book');
        }
    };

    window.deleteBook = async function(bookId) {
        if (!confirm('Delete this book permanently?')) return;
        
        try {
            await api.deleteBook(bookId);
            loadManageBooks();
            loadInventory();
            renderCatalog();
            alert('Book deleted!');
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Failed to delete book');
        }
    };

    window.showAddBookModal = async function() {
        const title = prompt('Enter book title:');
        const author = prompt('Enter author:');
        const isbn = prompt('Enter ISBN:');
        const category = prompt('Enter category:');
        
        if (!title || !author) {
            alert('Title and author are required');
            return;
        }
        
        try {
            await api.createBook({
                title, author, isbn, category,
                total_copies: 1
            });
            loadManageBooks();
            loadInventory();
            renderCatalog();
            alert('Book added successfully!');
        } catch (error) {
            console.error('Error adding book:', error);
            alert('Failed to add book');
        }
    };

    window.exportToPDF = async function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        try {
            const result = await api.getBooks({ limit: 500 });
            const books = result.books || [];
            
            doc.text('ULITMS - Book Catalog', 20, 20);
            let y = 40;
            books.forEach(book => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(`${book.title} | ${book.author}`, 20, y);
                y += 10;
            });
            doc.save('library_catalog.pdf');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF');
        }
    };

    // ========== BOOK INVENTORY ==========
    async function loadInventory() {
        try {
            const result = await api.getBooks({ limit: 500 });
            const books = result.books || [];
            const tbody = document.getElementById('inventory-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = books.map(book => `
                <tr>
                    <td>${book.isbn || 'N/A'}</td>
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category_name || book.category || 'General'}</td>
                    <td><span class="badge ${book.available_copies > 0 ? 'badge-green' : 'badge-red'}">${book.available_copies > 0 ? 'Available' : 'Borrowed'}</span></td>
                    <td><button class="btn-small" onclick="alert('Go to Manage Books to edit')">View</button></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    }

    // ========== USER MANAGEMENT ==========
    async function loadUserManagement() {
        try {
            const result = await api.getUsers();
            const users = result.users || [];
            const tbody = document.getElementById('user-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.first_name} ${user.last_name || ''}</td>
                    <td>${user.email}</td>
                    <td>${user.student_id || 'N/A'}</td>
                    <td>${user.course || 'N/A'}</td>
                    <td>${user.role === 'admin' ? 'Admin' : 'Student'}</td>
                    <td><button class="btn-small btn-danger" onclick="deleteUser(${user.id})">Remove</button></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    window.deleteUser = async function(userId) {
        if (!confirm('Delete this user permanently?')) return;
        
        try {
            await api.deleteUser(userId);
            loadUserManagement();
            renderDashboard();
            alert('User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    // ========== E-LIBRARY LOGS (ADMIN) ==========
    async function loadAdminSessions() {
        try {
            const result = await api.getAllElibrarySessions(500, 0);
            const sessions = result.sessions || [];
            const tbody = document.getElementById('admin-session-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = sessions.map(s => `
                <tr>
                    <td>${s.first_name || ''} ${s.last_name || ''}</td>
                    <td>Unit ${s.unit_number}</td>
                    <td>${new Date(s.time_in).toLocaleDateString()}</td>
                    <td>${new Date(s.time_in).toLocaleTimeString()}</td>
                    <td>${s.time_out ? new Date(s.time_out).toLocaleTimeString() : '--:--'}</td>
                    <td><span class="badge badge-teal">${s.time_out ? 'Completed' : 'Active'}</span></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading admin sessions:', error);
        }
    }

    // ========== MY BORROWINGS ==========
    async function renderBorrowings() {
        const currentUser = getCurrentUser();
        try {
            const result = await api.getUserBorrowings(currentUser.id);
            const borrowings = result.borrowings || [];
            const tbody = document.getElementById('borrow-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = borrowings.map(b => `
                <tr>
                    <td style="color:#27c4cc">#${b.id}</td>
                    <td>${b.title}</td>
                    <td>${new Date(b.borrowed_at).toLocaleDateString()}</td>
                    <td>${new Date(b.due_date).toLocaleDateString()}</td>
                    <td><span class="badge badge-yellow">${b.status}</span></td>
                </tr>
            `).join('');
            
            document.getElementById('borrow-stats').innerHTML = `
                <div class="stat-card"><div class="label">Currently Borrowed</div><div class="value">${borrowings.filter(b => b.status === 'borrowed').length}</div></div>
                <div class="stat-card"><div class="label">Total Borrowed</div><div class="value">${borrowings.length}</div></div>
                <div class="stat-card"><div class="label">Overdue Fines</div><div class="value">₱${borrowings.reduce((sum, b) => sum + (parseFloat(b.fine_amount) || 0), 0)}</div></div>
            `;
        } catch (error) {
            console.error('Error loading borrowings:', error);
        }
    }

    // ========== MY E-LIBRARY ==========
    async function renderElibrary() {
        const currentUser = getCurrentUser();
        try {
            const result = await api.getUserElibrarySessions(currentUser.id);
            const sessions = result.sessions || [];
            const tbody = document.getElementById('elib-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = sessions.map(s => {
                const duration = s.time_out ? 
                    Math.round((new Date(s.time_out) - new Date(s.time_in)) / (1000 * 60)) : 0;
                return `
                    <tr>
                        <td>${new Date(s.time_in).toLocaleDateString()}</td>
                        <td>Unit ${s.unit_number}</td>
                        <td>${new Date(s.time_in).toLocaleTimeString()}</td>
                        <td>${s.time_out ? new Date(s.time_out).toLocaleTimeString() : '--:--'}</td>
                        <td>${duration > 0 ? `${Math.floor(duration/60)}h ${duration%60}m` : 'Ongoing'}</td>
                        <td><span class="badge ${s.time_out ? 'badge-gray' : 'badge-teal'}">${s.time_out ? 'Done' : 'In Use'}</span></td>
                    </tr>
                `;
            }).join('');
            
            document.getElementById('elib-stats').innerHTML = `
                <div class="stat-card"><div class="label">Total Sessions</div><div class="value">${sessions.length}</div></div>
                <div class="stat-card"><div class="label">Active Now</div><div class="value">${sessions.filter(s => !s.time_out).length}</div></div>
            `;
        } catch (error) {
            console.error('Error loading elibrary:', error);
        }
    }

    // ========== MY PROFILE ==========
    async function renderProfile() {
        const currentUser = getCurrentUser();
        const container = document.getElementById('profile-content');
        if (!container) return;
        
        try {
            const result = await api.getUserProfile(currentUser.id);
            const user = result.user;
            const stats = result.stats;
            
            container.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar">${(user.first_name?.charAt(0) || 'U')}${(user.last_name?.charAt(0) || '')}</div>
                    <div>
                        <div class="profile-name">${user.first_name} ${user.last_name || ''}</div>
                        <div class="profile-meta">${user.student_id || 'N/A'} · ${user.role === 'admin' ? 'Administrator' : 'Student'}</div>
                        <div><span class="badge badge-green">Active</span></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-title">Personal Details</div>
                    <div class="detail-row"><span class="detail-key">ID Number</span><span class="detail-val">${user.student_id || 'N/A'}</span></div>
                    <div class="detail-row"><span class="detail-key">Full Name</span><span class="detail-val">${user.first_name} ${user.last_name}</span></div>
                    <div class="detail-row"><span class="detail-key">Role</span><span class="detail-val">${user.role === 'admin' ? 'Administrator' : 'Student'}</span></div>
                    <div class="detail-row"><span class="detail-key">Email</span><span class="detail-val">${user.email}</span></div>
                    <div class="detail-row"><span class="detail-key">Course</span><span class="detail-val">${user.course || 'N/A'}</span></div>
                    <div class="detail-row"><span class="detail-key">Year Level</span><span class="detail-val">${user.year_level || 'N/A'}</span></div>
                    <div class="detail-row"><span class="detail-key">Contact</span><span class="detail-val">${user.contact_number || 'N/A'}</span></div>
                </div>
                <div class="card">
                    <div class="card-title">Library Statistics</div>
                    <div class="detail-row"><span class="detail-key">Total Books Borrowed</span><span class="detail-val">${stats?.total_borrowed || 0}</span></div>
                    <div class="detail-row"><span class="detail-key">Currently Borrowed</span><span class="detail-val">${stats?.current_borrowed || 0}</span></div>
                    <div class="detail-row"><span class="detail-key">E-Library Sessions</span><span class="detail-val">${stats?.total_sessions || 0}</span></div>
                    <div class="detail-row"><span class="detail-key">Total Fines</span><span class="detail-val">₱${stats?.total_fines || 0}</span></div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading profile:', error);
            container.innerHTML = `<div class="card"><div class="card-title">Error loading profile</div></div>`;
        }
    }

    // ========== CHANGE PASSWORD ==========
    window.changePassword = async function() {
        const current = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        const currentUser = getCurrentUser();
        
        if (!current || !newPass || !confirm) {
            alert('Please fill in all fields');
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
        
        try {
            await api.changePassword(currentUser.id, {
                currentPassword: current,
                newPassword: newPass
            });
            
            alert('Password changed successfully!');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } catch (error) {
            console.error('Error changing password:', error);
            alert(error.message || 'Failed to change password');
        }
    };

    // ========== EQUIPMENT & MAINTENANCE ==========
    let equipmentData = [];
    let damageReports = [];

    async function renderEquipment() {
        try {
            const result = await api.getPeripherals(null, 500);
            equipmentData = result.peripherals || [];
            const tbody = document.getElementById('equipment-tbody');
            if (!tbody) return;
            
            const searchTerm = document.getElementById('equipment-search')?.value.toLowerCase() || '';
            let filtered = equipmentData;
            if (searchTerm) {
                filtered = equipmentData.filter(eq => 
                    eq.name?.toLowerCase().includes(searchTerm) ||
                    eq.brand?.toLowerCase().includes(searchTerm) ||
                    eq.serial_number?.toLowerCase().includes(searchTerm)
                );
            }
            
            tbody.innerHTML = filtered.map(eq => `
                <tr>
                    <td><strong>${eq.name}</strong></td>
                    <td><span class="badge badge-teal">${eq.category_name || 'Uncategorized'}</span></td>
                    <td>${eq.brand || ''} ${eq.model || ''}</td>
                    <td><code style="font-size: 0.75rem;">${eq.serial_number || 'N/A'}</code></td>
                    <td>${eq.unit_number ? `PC #${eq.unit_number}` : 'N/A'}</td>
                    <td>
                        <select class="form-input" style="width: 110px;" onchange="updateEquipmentCondition(${eq.id}, this.value)">
                            <option ${eq.condition === 'good' ? 'selected' : ''}>good</option>
                            <option ${eq.condition === 'damaged' ? 'selected' : ''}>damaged</option>
                            <option ${eq.condition === 'repair_needed' ? 'selected' : ''}>repair_needed</option>
                            <option ${eq.condition === 'missing' ? 'selected' : ''}>missing</option>
                        </select>
                    </td>
                    <td><span class="badge ${eq.is_active ? 'badge-green' : 'badge-yellow'}">${eq.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-small" onclick="editEquipment(${eq.id})">Edit</button>
                        <button class="btn-small btn-danger" onclick="deleteEquipment(${eq.id})">Delete</button>
                    </td>
                </tr>
            `).join('');
            
            // Update stats
            document.getElementById('total-equipment').textContent = equipmentData.length;
            document.getElementById('good-equipment').textContent = equipmentData.filter(e => e.condition === 'good').length;
            document.getElementById('repair-equipment').textContent = equipmentData.filter(e => ['repair_needed', 'damaged'].includes(e.condition)).length;
        } catch (error) {
            console.error('Error loading equipment:', error);
        }
    }

    async function renderDamageReports() {
        try {
            const result = await api.getDamageReports(500);
            damageReports = result.reports || [];
            const tbody = document.getElementById('damage-tbody');
            if (!tbody) return;
            
            const searchTerm = document.getElementById('damage-search')?.value.toLowerCase() || '';
            let filtered = damageReports;
            if (searchTerm) {
                filtered = damageReports.filter(d => 
                    d.damage_type?.toLowerCase().includes(searchTerm) ||
                    d.description?.toLowerCase().includes(searchTerm)
                );
            }
            
            tbody.innerHTML = filtered.map(d => `
                <tr>
                    <td style="color: #27c4cc;">#${d.id}</td>
                    <td>${d.reporter_name || 'Unknown'}</td>
                    <td><strong>${d.peripheral_name || 'Equipment'}</strong></td>
                    <td>${d.damage_type}</td>
                    <td><span class="badge ${d.severity === 'critical' ? 'badge-red' : d.severity === 'high' ? 'badge-red' : d.severity === 'medium' ? 'badge-yellow' : 'badge-blue'}">⚠️ ${d.severity?.toUpperCase() || 'LOW'}</span></td>
                    <td><span class="badge ${d.resolved_by ? 'badge-green' : 'badge-red'}">${d.resolved_by ? 'Resolved' : 'Pending'}</span></td>
                    <td>${new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-small" onclick="viewDamageReport(${d.id})">View</button>
                        ${!d.resolved_by ? `<button class="btn-small" onclick="resolveDamage(${d.id})">Resolve</button>` : ''}
                    </td>
                </tr>
            `).join('');
            
            // Update stats
            document.getElementById('total-reports').textContent = damageReports.length;
            document.getElementById('pending-reports').textContent = damageReports.filter(d => !d.resolved_by).length;
            document.getElementById('resolved-reports').textContent = damageReports.filter(d => d.resolved_by).length;
        } catch (error) {
            console.error('Error loading damage reports:', error);
        }
    }

    window.updateEquipmentCondition = async function(id, condition) {
        try {
            await api.updatePeripheralCondition(id, condition);
            renderEquipment();
        } catch (error) {
            console.error('Error updating condition:', error);
            alert('Failed to update condition');
        }
    };

    window.editEquipment = async function(id) {
        const peripheral = equipmentData.find(e => e.id === id);
        if (!peripheral) return;
        
        const newName = prompt('Enter equipment name:', peripheral.name);
        if (newName) {
            try {
                await api.updatePeripheral(id, { name: newName });
                renderEquipment();
            } catch (error) {
                console.error('Error updating equipment:', error);
            }
        }
    };

    window.deleteEquipment = async function(id) {
        if (!confirm('Delete this equipment permanently?')) return;
        try {
            await api.deletePeripheral(id);
            renderEquipment();
        } catch (error) {
            console.error('Error deleting equipment:', error);
            alert('Failed to delete equipment');
        }
    };

    window.showAddEquipmentModal = async function() {
        const name = prompt('Enter equipment name:');
        const category = prompt('Enter category (Keyboard, Mouse, etc.):');
        const brand = prompt('Enter brand:');
        const model = prompt('Enter model:');
        const serialNumber = prompt('Enter serial number:');
        
        if (!name) return;
        
        try {
            await api.createPeripheral({
                name, brand, model, serial_number: serialNumber,
                condition: 'good', is_active: true
            });
            renderEquipment();
            alert('Equipment added!');
        } catch (error) {
            console.error('Error adding equipment:', error);
            alert('Failed to add equipment');
        }
    };

    window.showAddDamageModal = async function() {
        const equipmentName = prompt('Enter equipment name with issue:');
        const damageType = prompt('Enter damage type:');
        const description = prompt('Enter description:');
        const severity = prompt('Enter severity (low, medium, high, critical):');
        
        if (!equipmentName || !damageType || !description) return;
        
        try {
            await api.createDamageReport({
                damage_type: damageType,
                description: description,
                severity: severity || 'low',
                peripheral_id: null // Would need to find by name
            });
            renderDamageReports();
            alert('Damage report submitted!');
        } catch (error) {
            console.error('Error adding damage report:', error);
            alert('Failed to submit report');
        }
    };

    window.viewDamageReport = async function(id) {
        try {
            const result = await api.getDamageReport(id);
            const report = result.report;
            alert(`📋 DAMAGE REPORT #${report.id}\n\nEquipment: ${report.peripheral_name || 'N/A'}\nDamage Type: ${report.damage_type}\nSeverity: ${report.severity}\nStatus: ${report.resolved_by ? 'Resolved' : 'Pending'}\n\nDescription: ${report.description}`);
        } catch (error) {
            console.error('Error viewing report:', error);
        }
    };

    window.resolveDamage = async function(id) {
        if (!confirm('Mark this report as resolved?')) return;
        const resolution = prompt('Enter resolution notes:');
        
        try {
            await api.resolveDamageReport(id, resolution || 'Resolved by admin');
            renderDamageReports();
            alert('Report resolved!');
        } catch (error) {
            console.error('Error resolving report:', error);
            alert('Failed to resolve report');
        }
    };

    window.switchMaintenanceTab = function(tab) {
        const equipmentTab = document.getElementById('equipment-tab');
        const damageTab = document.getElementById('damage-tab');
        const tabs = document.querySelectorAll('.tab-btn');
        
        tabs.forEach(btn => {
            btn.style.color = '#94a3b8';
            btn.style.borderBottom = '2px solid transparent';
        });
        
        if (tab === 'equipment') {
            if (equipmentTab) equipmentTab.style.display = 'block';
            if (damageTab) damageTab.style.display = 'none';
            tabs[0].style.color = '#6adde2';
            tabs[0].style.borderBottom = '2px solid #27c4cc';
            renderEquipment();
        } else {
            if (equipmentTab) equipmentTab.style.display = 'none';
            if (damageTab) damageTab.style.display = 'block';
            tabs[1].style.color = '#6adde2';
            tabs[1].style.borderBottom = '2px solid #27c4cc';
            renderDamageReports();
        }
    };

    function setupMaintenanceSearch() {
        const equipSearch = document.getElementById('equipment-search');
        const damageSearch = document.getElementById('damage-search');
        
        if (equipSearch) equipSearch.addEventListener('input', () => renderEquipment());
        if (damageSearch) damageSearch.addEventListener('input', () => renderDamageReports());
    }

    // ========== INITIALIZATION ==========
    window.loadAllData = async function() {
        console.log('Loading all data from API...');
        
        showUserMenu();
        setupNavigation();
        
        // Render all pages
        await renderDashboard();
        await renderCatalog();
        await renderBorrowings();
        await renderElibrary();
        await renderProfile();
        
        const currentUser = getCurrentUser();
        if (currentUser.role === 'admin') {
            await loadManageBooks();
            await loadInventory();
            await loadUserManagement();
            await loadAdminSessions();
            await renderEquipment();
            await renderDamageReports();
        }
        
        console.log('All data loaded');
    };

    function setupNavigation() {
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            el.removeEventListener('click', navigationHandler);
            el.addEventListener('click', navigationHandler);
        });
    }
    
    function navigationHandler(e) {
        const page = this.dataset.page;
        if (page) window.navigate(page);
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            if (localStorage.getItem('ulitms_token')) {
                await window.loadAllData();
            }
        }, 100);
    });

    // Expose functions globally
    window.showUserMenu = showUserMenu;
    window.loadAllData = window.loadAllData;
})();