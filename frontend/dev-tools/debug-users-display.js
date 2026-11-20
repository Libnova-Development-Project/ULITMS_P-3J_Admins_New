// Debug User Display Issue
function debugUserDisplay() {
    console.log('=== User Display Debug ===');
    
    // Check if usersAPI is available
    console.log('usersAPI available:', typeof usersAPI !== 'undefined');
    console.log('loadUsers function available:', typeof loadUsers !== 'undefined');
    console.log('displayUsers function available:', typeof displayUsers !== 'undefined');
    
    // Check if table exists
    const tbody = document.getElementById('users-tbody');
    console.log('Table tbody exists:', !!tbody);
    if (tbody) {
        console.log('Table tbody current content:', tbody.innerHTML);
    }
    
    // Check users array
    console.log('Users array:', typeof users !== 'undefined' ? users : 'undefined');
    if (typeof users !== 'undefined') {
        console.log('Users array length:', users.length);
        console.log('Users array content:', users);
    }
    
    // Test loadUsers function directly
    console.log('\n=== Testing loadUsers function ===');
    if (typeof loadUsers === 'function') {
        console.log('Calling loadUsers()...');
        loadUsers().then(() => {
            console.log('loadUsers completed');
            console.log('Users array after loadUsers:', users);
            console.log('Users array length after loadUsers:', users.length);
            
            // Test displayUsers function
            console.log('\n=== Testing displayUsers function ===');
            if (typeof displayUsers === 'function') {
                console.log('Calling displayUsers()...');
                displayUsers();
                console.log('displayUsers completed');
                
                // Check table content after display
                const tbodyAfter = document.getElementById('users-tbody');
                if (tbodyAfter) {
                    console.log('Table tbody after displayUsers:', tbodyAfter.innerHTML);
                    console.log('Table row count:', tbodyAfter.children.length);
                }
            } else {
                console.log('displayUsers function not found');
            }
        }).catch(error => {
            console.error('loadUsers error:', error);
        });
    } else {
        console.log('loadUsers function not found');
    }
    
    // Test API call directly
    console.log('\n=== Testing API call directly ===');
    if (typeof usersAPI !== 'undefined') {
        usersAPI.getUsers().then(data => {
            console.log('Direct API call result:', data);
            console.log('Users from API:', data.users);
            console.log('Users count:', data.users ? data.users.length : 0);
        }).catch(error => {
            console.error('Direct API call error:', error);
        });
    } else {
        console.log('usersAPI not available');
    }
}

// Run debug
debugUserDisplay();
