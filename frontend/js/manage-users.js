// User Management JavaScript
let users = [];

// Load users from API
async function loadUsers() {
    try {
        const data = await usersAPI.getUsers();
        users = data.users || [];
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        utils.showNotification('Error loading users', 'error');
    }
}

// Display users in table
function displayUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.student_id || 'N/A'}</td>
            <td>${user.first_name} ${user.middle_name || ''} ${user.last_name}</td>
            <td>${user.email}</td>
            <td>${user.contact_number || 'N/A'}</td>
            <td>${user.course || 'N/A'}</td>
            <td>Year ${user.year_level || 'N/A'}</td>
            <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button onclick="editUser(${user.id})" class="btn-icon" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleUserStatus(${user.id})" class="btn-icon ${user.is_active ? 'btn-warning' : 'btn-success'}" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${user.is_active ? 'user-slash' : 'user-check'}"></i>
                </button>
                <button onclick="deleteUser(${user.id})" class="btn-icon btn-danger" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show add user modal
function showAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'block';
}

// Edit user
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Populate edit form
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-student-id').value = user.student_id || '';
    document.getElementById('edit-user-first-name').value = user.first_name;
    document.getElementById('edit-user-middle-name').value = user.middle_name || '';
    document.getElementById('edit-user-last-name').value = user.last_name;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-contact').value = user.contact_number || '';
    document.getElementById('edit-user-course').value = user.course || '';
    document.getElementById('edit-user-year').value = user.year_level || '';
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('edit-user-active').checked = user.is_active;
    
    // Show modal
    document.getElementById('edit-user-modal').style.display = 'block';
}

// Toggle user status
async function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
        const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ is_active: newStatus })
        });
        
        if (response.ok) {
            showNotification(`User ${action}d successfully`, 'success');
            loadUsers();
        } else {
            showNotification(`Failed to ${action} user`, 'error');
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showNotification('Error updating user status', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            showNotification('User deleted successfully', 'success');
            loadUsers();
        } else {
            showNotification('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export users
function exportUsers() {
    // Create CSV content
    let csv = 'Student ID,First Name,Middle Name,Last Name,Email,Contact,Course,Year Level,Role,Status\n';
    
    users.forEach(user => {
        csv += `"${user.student_id || ''}","${user.first_name}","${user.middle_name || ''}","${user.last_name}","${user.email}","${user.contact_number || ''}","${user.course || ''}","${user.year_level || ''}","${user.role}","${user.is_active ? 'Active' : 'Inactive'}"\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Search and filter functionality
document.getElementById('user-search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = users.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.student_id && user.student_id.toLowerCase().includes(searchTerm))
    );
    displayFilteredUsers(filteredUsers);
});

document.getElementById('role-filter').addEventListener('change', function(e) {
    const role = e.target.value;
    const filteredUsers = role ? 
        users.filter(user => user.role === role) : 
        users;
    displayFilteredUsers(filteredUsers);
});

document.getElementById('status-filter').addEventListener('change', function(e) {
    const status = e.target.value;
    const filteredUsers = status ? 
        users.filter(user => user.is_active.toString() === status) : 
        users;
    displayFilteredUsers(filteredUsers);
});

// Display filtered users
function displayFilteredUsers(filteredUsers) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    filteredUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.student_id || 'N/A'}</td>
            <td>${user.first_name} ${user.middle_name || ''} ${user.last_name}</td>
            <td>${user.email}</td>
            <td>${user.contact_number || 'N/A'}</td>
            <td>${user.course || 'N/A'}</td>
            <td>Year ${user.year_level || 'N/A'}</td>
            <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button onclick="editUser(${user.id})" class="btn-icon" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleUserStatus(${user.id})" class="btn-icon ${user.is_active ? 'btn-warning' : 'btn-success'}" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${user.is_active ? 'user-slash' : 'user-check'}"></i>
                </button>
                <button onclick="deleteUser(${user.id})" class="btn-icon btn-danger" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Form submissions
document.getElementById('add-user-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        student_id: document.getElementById('user-student-id').value,
        first_name: document.getElementById('user-first-name').value,
        middle_name: document.getElementById('user-middle-name').value,
        last_name: document.getElementById('user-last-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
        contact_number: document.getElementById('user-contact').value,
        course: document.getElementById('user-course').value,
        year_level: parseInt(document.getElementById('user-year').value) || null,
        is_active: document.getElementById('user-active').checked
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('User added successfully', 'success');
            closeModal('add-user-modal');
            document.getElementById('add-user-form').reset();
            loadUsers();
        } else {
            showNotification('Failed to add user', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification('Error adding user', 'error');
    }
});

document.getElementById('edit-user-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const formData = {
        student_id: document.getElementById('edit-user-student-id').value,
        first_name: document.getElementById('edit-user-first-name').value,
        middle_name: document.getElementById('edit-user-middle-name').value,
        last_name: document.getElementById('edit-user-last-name').value,
        email: document.getElementById('edit-user-email').value,
        role: document.getElementById('edit-user-role').value,
        contact_number: document.getElementById('edit-user-contact').value,
        course: document.getElementById('edit-user-course').value,
        year_level: parseInt(document.getElementById('edit-user-year').value) || null,
        is_active: document.getElementById('edit-user-active').checked
    };
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('User updated successfully', 'success');
            closeModal('edit-user-modal');
            loadUsers();
        } else {
            showNotification('Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user', 'error');
    }
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
