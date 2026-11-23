// ULITMS Catalog Functions
const API_URL = window.API_BASE_URL || 'http://localhost:5000/api';

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
        
        const books = data.data?.books || data.data || [];
        
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
    confirmAction(`Submit a borrowing request for "${title}"?`, async () => {
        try {
            showLoading('Submitting borrowing request...');
            const response = await fetch(`${API_URL}/borrowings`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('ulitms_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ book_id: Number(bookId) })
            });
            const data = await response.json();
            hideLoading();
            if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
            showSuccess('Borrowing request submitted. It is pending administrator approval.');
            loadCatalog();
        } catch (error) {
            hideLoading();
            console.error('Borrow request error:', error);
            showError(error.message || 'Unable to submit borrowing request.');
        }
    }, { title: 'Request Book', confirmText: 'Submit Request' });
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
