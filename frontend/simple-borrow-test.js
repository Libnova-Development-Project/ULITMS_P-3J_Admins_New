// Simple Borrow Test - Direct API call without complex logic
async function testBorrowBook(bookId) {
    console.log('Testing borrow for book ID:', bookId);
    
    try {
        const token = localStorage.getItem('ulitms_token');
        if (!token) {
            console.error('No token found');
            return;
        }
        
        // Get user ID from token
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenData.id; // Fixed: use 'id' instead of 'userId'
        
        console.log('User ID from token:', userId);
        
        // Simple borrow request
        const response = await fetch('http://localhost:5000/api/borrowings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                book_id: bookId,
                due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response body:', result);
        
        if (response.ok) {
            alert('Book borrowed successfully!');
            // Reload books
            if (window.loadBooks) {
                window.loadBooks();
            }
        } else {
            alert('Borrow failed: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Borrow test error:', error);
        alert('Borrow test error: ' + error.message);
    }
}

// Make it globally available
window.testBorrowBook = testBorrowBook;
