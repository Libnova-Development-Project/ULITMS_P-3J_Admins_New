// Simple Users Display with Delete Button
async function loadUsersWithDelete() {
    console.log('Loading users with delete buttons...');
    
    try {
        const token = localStorage.getItem('ulitms_token');
        if (!token) {
            console.error('No token found');
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Users data:', data);
        
        const tbody = document.getElementById('users-tbody');
        if (!tbody) {
            console.error('Table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
            return;
        }
        
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.first_name || ''} ${user.last_name || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.student_id || 'N/A'}</td>
                <td>${user.course || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td>
                    <button onclick="deleteUser(${user.id})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;" title="Delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`Loaded ${data.users.length} users with delete buttons`);
        
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('users-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// Delete user function
window.deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('ulitms_token');
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('User deleted:', result);
        
        // Reload users
        loadUsersWithDelete();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete user: ' + error.message);
    }
};

// Auto-load when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUsersWithDelete);
} else {
    loadUsersWithDelete();
}

// Make it globally available
window.loadUsersWithDelete = loadUsersWithDelete;
