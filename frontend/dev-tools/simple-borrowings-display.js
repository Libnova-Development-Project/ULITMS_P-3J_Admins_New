// Simple Borrowings Display
async function loadBorrowings() {
    console.log('Loading borrowings...');
    
    try {
        const token = localStorage.getItem('ulitms_token');
        if (!token) {
            console.error('No token found');
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/borrowings', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Borrowings data:', data);
        
        const tbody = document.getElementById('borrowings-tbody');
        if (!tbody) {
            console.error('Borrowings table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        // Handle different response structures
        const borrowings = data.data?.borrowings || data.borrowings || data.data || data;
        console.log('Borrowings array:', borrowings);
        
        if (!borrowings || !Array.isArray(borrowings) || borrowings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No borrowings found</td></tr>';
            return;
        }
        
        borrowings.forEach(borrowing => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${borrowing.book_title || borrowing.title || 'N/A'}</td>
                <td>${borrowing.book_author || borrowing.author || 'N/A'}</td>
                <td>${borrowing.borrow_date || borrowing.created_at || 'N/A'}</td>
                <td>${borrowing.due_date || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${borrowing.status || 'borrowed'}">
                        ${borrowing.status || 'Borrowed'}
                    </span>
                </td>
                <td>
                    ${borrowing.status === 'borrowed' ? 
                        `<button onclick="returnBook(${borrowing.id})" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" title="Return">
                            <i class="fas fa-undo"></i> Return
                        </button>` : 
                        `<span style="color: #10b981; font-weight: bold;">Returned</span>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`Loaded ${borrowings.length} borrowings`);
        
    } catch (error) {
        console.error('Error loading borrowings:', error);
        const tbody = document.getElementById('borrowings-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// Return book function
window.returnBook = async (borrowingId) => {
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('ulitms_token');
        const response = await fetch(`http://localhost:5000/api/borrowings/${borrowingId}/return`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Book returned:', result);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            background: #10b981;
        `;
        notification.textContent = 'Book returned successfully!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
        
        // Reload borrowings
        loadBorrowings();
        
    } catch (error) {
        console.error('Return error:', error);
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            background: #ef4444;
        `;
        notification.textContent = 'Failed to return book: ' + error.message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
};

// Auto-load when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBorrowings);
} else {
    loadBorrowings();
}

// Make it globally available
window.loadBorrowings = loadBorrowings;
