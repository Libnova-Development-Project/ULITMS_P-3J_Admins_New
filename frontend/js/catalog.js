// ULITMS Catalog Functions
const API_URL = (window.ULITMS_API_URL || 'http://localhost:5000') + '/api';

async function loadCatalog() {
    const tbody = document.getElementById('catalog-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading books...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/books`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token') }
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        const books = data.data.books || data.data || [];
        
        if (books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No books found in catalog</td></tr>';
            return;
        }
        
        tbody.innerHTML = books.map(book => {
            const isAvailable = book.available_copies > 0;
            return `
                <tr>
                    <td><strong>${book.title}</strong></td>
                    <td>${book.author}</td>
                    <td><code style="font-size:0.8rem;">${book.isbn || 'N/A'}</code></td>
                    <td><span class="badge badge-info">${book.category_name || book.category || 'General'}</span></td>
                    <td>
                        <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
                            ${isAvailable ? 'Available' : 'Borrowed'}
                        </span>
                    </td>
                    <td>
                        ${isAvailable ? 
                            `<button class="btn-small btn-primary" onclick="borrowBook(${book.id}, '${book.title.replace(/'/g, "\\'")}')">
                                <i class="fas fa-hand-holding"></i> Borrow
                            </button>` : 
                            `<button class="btn-small btn-secondary" disabled>Unavailable</button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Catalog error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f87171;">Failed to load catalog</td></tr>';
    }
}

window.borrowBook = async (bookId, title) => {
    confirmAction(`Are you sure you want to borrow "${title}"?`, async () => {
        const userId = localStorage.getItem('ulitms_user_id');
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // Default 7 days
        
        try {
            showLoading('Processing borrowing request...');
            const response = await fetch(`${API_URL}/borrowings`, {
                method: 'POST',
                headers: { 
                    'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    book_id: bookId,
                    due_date: dueDate.toISOString()
                })
            });
            
            const data = await response.json();
            hideLoading();
            
            if (data.success) {
                showSuccess('Book borrowed successfully! Check "My Borrowings" for details.');
                loadCatalog(); // Refresh catalog
            } else {
                showError('Failed to borrow: ' + data.message);
            }
        } catch (error) {
            hideLoading();
            console.error('Borrow error:', error);
            showError('An error occurred while borrowing the book.');
        }
    }, { title: 'Borrow Book', confirmText: 'Borrow' });
};

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#catalog-tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }
});
