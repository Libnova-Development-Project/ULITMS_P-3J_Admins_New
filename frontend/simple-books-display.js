// Simple Books Display with Borrow Functionality
async function loadBooks() {
    console.log('Loading books...');
    
    try {
        const token = localStorage.getItem('ulitms_token');
        if (!token) {
            console.error('No token found');
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/books', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Books data:', data);
        
        const tbody = document.getElementById('catalog-tbody');
        if (!tbody) {
            console.error('Books table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        // Handle different response structures
        const books = data.data?.books || data.books || data.data || data;
        console.log('Books array:', books);
        
        if (!books || !Array.isArray(books) || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No books found</td></tr>';
            return;
        }
        
        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book.isbn || 'N/A'}</td>
                <td>${book.title || 'N/A'}</td>
                <td>${book.author || 'N/A'}</td>
                <td>${book.category_name || 'N/A'}</td>
                <td>${book.available_copies || 0} / ${book.total_copies || 0}</td>
                <td>
                    <span class="status-badge status-${book.status || 'available'}">${book.status || 'Available'}</span>
                </td>
                <td>
                    ${book.available_copies > 0 ? 
                        `<div>
                            <button onclick="borrowBook(${book.id})" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;" title="Borrow">
                                <i class="fas fa-book"></i> Borrow
                            </button>
                            <button onclick="testBorrowBook(${book.id})" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" title="Test Borrow">
                                <i class="fas fa-flask"></i> Test
                            </button>
                        </div>` : 
                        `<span style="color: #ef4444; font-weight: bold;">Not Available</span>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`Loaded ${data.data.length} books`);
        
    } catch (error) {
        console.error('Error loading books:', error);
        const tbody = document.getElementById('catalog-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// Borrow book function
window.borrowBook = async (bookId) => {
    // Create custom confirmation dialog
    const confirmed = await showBorrowConfirmation();
    if (!confirmed) {
        return;
    }
    
    try {
        const token = localStorage.getItem('ulitms_token');
        // Get user info from token
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenData.id; // Fixed: use 'id' instead of 'userId'
        
        console.log('Borrowing book:', { userId, bookId });
        
        const response = await fetch('http://localhost:5000/api/borrowings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                book_id: bookId,
                due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days from now
            })
        });
        
        const result = await response.json();
        console.log('Borrow response:', result);
        
        if (!response.ok) {
            console.error('Borrow failed:', { status: response.status, result });
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log('Book borrowed:', result);
        showNotification('Book borrowed successfully! Due date: ' + (result.due_date || '14 days'), 'success');
        
        // Reload books
        loadBooks();
        
    } catch (error) {
        console.error('Borrow error:', error);
        showNotification('Failed to borrow book: ' + error.message, 'error');
    }
};

// Auto-load when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBooks);
} else {
    loadBooks();
}

// Custom confirmation dialog
function showBorrowConfirmation() {
    return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        // Create dialog content
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Confirm Borrow</h3>
            <p style="margin: 0 0 25px 0; color: #666;">Are you sure you want to borrow this book? The due date will be 14 days from today.</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="cancel-borrow" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
                <button id="confirm-borrow" style="
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Borrow Book</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Handle button clicks
        document.getElementById('confirm-borrow').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        document.getElementById('cancel-borrow').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(false);
            }
        };
    });
}

// Show notification
function showNotification(message, type = 'info') {
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
        max-width: 300px;
        ${type === 'success' ? 'background: #10b981;' : 
          type === 'error' ? 'background: #ef4444;' : 
          'background: #3b82f6;'}
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Make it globally available
window.loadBooks = loadBooks;
