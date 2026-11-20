// Debug Borrow Function
async function debugBorrow() {
    console.log('=== Debug Borrow Function ===');
    
    try {
        const token = localStorage.getItem('ulitms_token');
        if (!token) {
            console.error('No token found');
            return;
        }
        
        // Test token decode
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            console.log('Token data:', tokenData);
            console.log('User ID:', tokenData.userId);
        } catch (e) {
            console.error('Token decode error:', e);
        }
        
        // Test API call with detailed logging
        const bookId = 1; // Test with book ID 1
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const userId = tokenData.userId;
        
        console.log('Sending borrow request:', {
            user_id: userId,
            book_id: bookId,
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        
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
        console.log('Response headers:', [...response.headers.entries()]);
        
        const result = await response.json();
        console.log('Response body:', result);
        
        if (!response.ok) {
            console.error('Borrow failed:', { status: response.status, result });
        } else {
            console.log('Borrow success:', result);
        }
        
    } catch (error) {
        console.error('Debug borrow error:', error);
    }
}

// Run debug function
debugBorrow();
