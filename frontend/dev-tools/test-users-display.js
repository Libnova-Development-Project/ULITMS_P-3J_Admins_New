// Test Users Display - Simple version
async function testUsersDisplay() {
    console.log('=== Testing Users Display ===');
    
    try {
        // Get token
        const token = localStorage.getItem('ulitms_token');
        console.log('Token:', token ? 'exists' : 'missing');
        
        // Make API call
        const response = await fetch('http://localhost:5000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Get table body
        const tbody = document.getElementById('users-tbody');
        if (!tbody) {
            console.error('Table tbody not found');
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Check if users exist
        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
            return;
        }
        
        // Display users
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.first_name || ''} ${user.last_name || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.student_id || 'N/A'}</td>
                <td>${user.course || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td>
                    <button onclick="editUser(${user.id})" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteUser(${user.id})" class="btn-icon btn-danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`Displayed ${data.users.length} users`);
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('users-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// Auto-run when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testUsersDisplay);
} else {
    testUsersDisplay();
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
        
        const data = await response.json();
        console.log('User deleted:', data);
        
        // Reload users
        testUsersDisplay();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete user: ' + error.message);
    }
};

// Edit user function (placeholder)
window.editUser = (userId) => {
    alert('Edit functionality not implemented yet. User ID: ' + userId);
};

// Also make it globally available
window.testUsersDisplay = testUsersDisplay;
