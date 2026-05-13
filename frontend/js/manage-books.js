// Book Management JavaScript
let books = [];
let categories = [];

// Load books from API
async function loadBooks() {
    try {
        const response = await fetch('/api/books', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            books = data.data || [];
            displayBooks();
        } else {
            showNotification('Failed to load books', 'error');
        }
    } catch (error) {
        console.error('Error loading books:', error);
        showNotification('Error loading books', 'error');
    }
}

// Load categories for dropdown
async function loadCategories() {
    try {
        const response = await fetch('/api/book-categories', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            categories = data.data || [];
            populateCategoryDropdowns();
        } else {
            showNotification('Failed to load categories', 'error');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display books in table
function displayBooks() {
    const tbody = document.getElementById('books-tbody');
    tbody.innerHTML = '';
    
    books.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.isbn}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category_name || 'N/A'}</td>
            <td>${book.total_copies}</td>
            <td>${book.available_copies}</td>
            <td><span class="status-badge status-${book.status}">${book.status}</span></td>
            <td>
                <button onclick="editBook(${book.id})" class="btn-icon" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteBook(${book.id})" class="btn-icon btn-danger" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate category dropdowns
function populateCategoryDropdowns() {
    const categoryFilter = document.getElementById('category-filter');
    const bookCategory = document.getElementById('book-category');
    const editBookCategory = document.getElementById('edit-book-category');
    
    const options = '<option value="">All Categories</option>';
    categories.forEach(category => {
        options += `<option value="${category.id}">${category.name}</option>`;
    });
    
    categoryFilter.innerHTML = options;
    bookCategory.innerHTML = options;
    editBookCategory.innerHTML = options;
}

// Show add book modal
function showAddBookModal() {
    document.getElementById('add-book-modal').style.display = 'block';
}

// Edit book
function editBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    // Populate edit form
    document.getElementById('edit-book-id').value = book.id;
    document.getElementById('edit-book-isbn').value = book.isbn;
    document.getElementById('edit-book-title').value = book.title;
    document.getElementById('edit-book-author').value = book.author;
    document.getElementById('edit-book-publisher').value = book.publisher || '';
    document.getElementById('edit-book-year').value = book.publication_year || '';
    document.getElementById('edit-book-category').value = book.category_id || '';
    document.getElementById('edit-book-copies').value = book.total_copies;
    document.getElementById('edit-book-description').value = book.description || '';
    document.getElementById('edit-book-cover').value = book.cover_image_url || '';
    
    // Show modal
    document.getElementById('edit-book-modal').style.display = 'block';
}

// Delete book
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
        const response = await fetch(`/api/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            showNotification('Book deleted successfully', 'success');
            loadBooks();
        } else {
            showNotification('Failed to delete book', 'error');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        showNotification('Error deleting book', 'error');
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

// Export books
function exportBooks() {
    // Create CSV content
    let csv = 'ISBN,Title,Author,Category,Total Copies,Available Copies,Status\n';
    
    books.forEach(book => {
        csv += `"${book.isbn}","${book.title}","${book.author}","${book.category_name || ''}","${book.total_copies}","${book.available_copies}","${book.status}"\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Search and filter functionality
document.getElementById('book-search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.isbn.toLowerCase().includes(searchTerm)
    );
    displayFilteredBooks(filteredBooks);
});

document.getElementById('category-filter').addEventListener('change', function(e) {
    const categoryId = e.target.value;
    const filteredBooks = categoryId ? 
        books.filter(book => book.category_id == categoryId) : 
        books;
    displayFilteredBooks(filteredBooks);
});

document.getElementById('status-filter').addEventListener('change', function(e) {
    const status = e.target.value;
    const filteredBooks = status ? 
        books.filter(book => book.status === status) : 
        books;
    displayFilteredBooks(filteredBooks);
});

// Display filtered books
function displayFilteredBooks(filteredBooks) {
    const tbody = document.getElementById('books-tbody');
    tbody.innerHTML = '';
    
    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.isbn}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category_name || 'N/A'}</td>
            <td>${book.total_copies}</td>
            <td>${book.available_copies}</td>
            <td><span class="status-badge status-${book.status}">${book.status}</span></td>
            <td>
                <button onclick="editBook(${book.id})" class="btn-icon" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteBook(${book.id})" class="btn-icon btn-danger" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Form submissions
document.getElementById('add-book-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        isbn: document.getElementById('book-isbn').value,
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        publisher: document.getElementById('book-publisher').value,
        publication_year: parseInt(document.getElementById('book-year').value) || null,
        category_id: parseInt(document.getElementById('book-category').value) || null,
        total_copies: parseInt(document.getElementById('book-copies').value),
        description: document.getElementById('book-description').value,
        cover_image_url: document.getElementById('book-cover').value
    };
    
    try {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Book added successfully', 'success');
            closeModal('add-book-modal');
            document.getElementById('add-book-form').reset();
            loadBooks();
        } else {
            showNotification('Failed to add book', 'error');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showNotification('Error adding book', 'error');
    }
});

document.getElementById('edit-book-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const bookId = document.getElementById('edit-book-id').value;
    const formData = {
        isbn: document.getElementById('edit-book-isbn').value,
        title: document.getElementById('edit-book-title').value,
        author: document.getElementById('edit-book-author').value,
        publisher: document.getElementById('edit-book-publisher').value,
        publication_year: parseInt(document.getElementById('edit-book-year').value) || null,
        category_id: parseInt(document.getElementById('edit-book-category').value) || null,
        total_copies: parseInt(document.getElementById('edit-book-copies').value),
        description: document.getElementById('edit-book-description').value,
        cover_image_url: document.getElementById('edit-book-cover').value
    };
    
    try {
        const response = await fetch(`/api/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Book updated successfully', 'success');
            closeModal('edit-book-modal');
            loadBooks();
        } else {
            showNotification('Failed to update book', 'error');
        }
    } catch (error) {
        console.error('Error updating book:', error);
        showNotification('Error updating book', 'error');
    }
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
