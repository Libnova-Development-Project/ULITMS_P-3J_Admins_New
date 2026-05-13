// ULITMS Borrowings Functions - Clean Version

// API Configuration
const API_URL = window.location.origin + '/api';

// Utility Functions
function getToken() { return localStorage.getItem('ulitms_token'); }
function getUserId() { return localStorage.getItem('ulitms_user_id'); }
function getUserName() { return localStorage.getItem('ulitms_name'); }

// Authentication Check
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

// User Interface Updates
function updateUserInfo() {
    const name = getUserName() || 'Guest';
    const role = localStorage.getItem('ulitms_role') || 'visitor';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    // Update all user info elements
    document.querySelectorAll('#sidebar-avatar, #header-avatar').forEach(el => {
        el.textContent = initials;
    });
    
    document.querySelectorAll('#sidebar-name, #header-name').forEach(el => {
        el.textContent = name;
    });
    
    document.querySelectorAll('#sidebar-role, #header-role').forEach(el => {
        el.textContent = role === 'admin' ? 'Administrator' : 'Student';
    });
}

// Format Helper
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatStatus(status) {
    const statusMap = {
        'borrowed': 'Borrowed',
        'returned': 'Returned',
        'overdue': 'Overdue'
    };
    return statusMap[status] || status;
}

// Load Borrowings
async function loadBorrowings() {
    const tbody = document.getElementById('borrow-tbody');
    const userId = getUserId();
    
    if (!userId) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Please login</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/borrowings/user/${userId}`, {
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load borrowings');
        }
        
        const borrowings = data.data.borrowings || data.data || [];
        
        if (borrowings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No borrowing records found</td></tr>';
            return;
        }
        
        tbody.innerHTML = borrowings.map(borrowing => {
            const isOverdue = new Date(borrowing.due_date) < new Date();
            const statusClass = borrowing.status === 'returned' ? 'badge-info' : (isOverdue ? 'badge-danger' : 'badge-warning');
            const statusText = formatStatus(borrowing.status);
            
            return `
                <tr>
                    <td><span style="color:#27c4cc;">#${borrowing.id}</span></td>
                    <td><strong>${borrowing.book_title || borrowing.title}</strong></td>
                    <td>${borrowing.borrowed_at ? formatDate(borrowing.borrowed_at) : 'N/A'}</td>
                    <td>${borrowing.due_date ? formatDate(borrowing.due_date) : 'N/A'}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${borrowing.status !== 'returned' ? `<button class="btn-small btn-secondary" onclick="returnBook(${borrowing.id})">Return</button>` : '-'}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Load borrowings error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Failed to load borrowings</td></tr>';
    }
}

// Return Book
async function returnBook(id) {
    if (!confirm('Are you sure you want to return this book?')) return;
    
    try {
        const response = await fetch(`${API_URL}/borrowings/${id}/return`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        if (response.ok) {
            alert('Book returned successfully!');
            loadBorrowings();
        } else {
            throw new Error('Failed to return book');
        }
    } catch (error) {
        alert('Failed to return book');
    }
}

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    updateUserInfo();
    loadBorrowings();
});
