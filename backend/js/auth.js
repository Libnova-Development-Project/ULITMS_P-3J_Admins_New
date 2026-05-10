// Authentication module with backend integration
(function() {
    
    // Show/hide auth panels
    window.showAuthPanel = function(panel) {
        const signin = document.getElementById('signin-panel');
        const signup = document.getElementById('signup-panel');
        const success = document.getElementById('success-panel');
        
        if (signin) signin.style.display = panel === 'signin' ? 'block' : 'none';
        if (signup) signup.style.display = panel === 'signup' ? 'block' : 'none';
        if (success) success.style.display = panel === 'success' ? 'block' : 'none';
        
        if (panel === 'signin' && window.toggleLoginField) {
            window.toggleLoginField();
        }
    };

    // Login function with backend API
    window.login = async function() {
        const identifier = document.getElementById('login-identifier')?.value.trim();
        const password = document.getElementById('login-password')?.value.trim();
        const role = document.getElementById('login-role')?.value;
        
        console.log('Login - Identifier:', identifier, 'Role:', role);
        
        if (!identifier || !password) {
            alert('Please enter your ' + (role === 'admin' ? 'Librarian ID' : 'Student ID') + ' and password.');
            return;
        }
        
        try {
            // For demo purposes, we need to map identifier to email
            // In production, you'd have a proper login endpoint that accepts student_id
            let email = '';
            if (role === 'admin') {
                if (identifier === 'LIB001') email = 'admin@ulitms.com';
                else throw new Error('Invalid admin credentials');
            } else {
                if (identifier === '2024-01018') email = 'student@test.com';
                else throw new Error('Invalid student credentials');
            }
            
            const response = await api.login({ email, password, role });
            
            if (response.token && response.user) {
                // Store user data
                localStorage.setItem('ulitms_role', response.user.role);
                localStorage.setItem('ulitms_name', `${response.user.first_name || ''} ${response.user.last_name || ''}`);
                localStorage.setItem('ulitms_email', response.user.email);
                localStorage.setItem('ulitms_studentid', response.user.student_id || '');
                localStorage.setItem('ulitms_userId', response.user.id);
                
                console.log('Login successful!');
                
                const authLanding = document.getElementById('auth-landing');
                if (authLanding) {
                    authLanding.style.display = 'none';
                    document.body.style.overflow = '';
                    if (window.initAuth) window.initAuth();
                    if (window.loadAllData) window.loadAllData();
                    if (window.showUserMenu) window.showUserMenu();
                } else {
                    location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message + '\n\nDemo credentials:\nStudent: 2024-01018 / student123\nAdmin: LIB001 / admin123');
        }
    };

    // Register function with backend API
    window.createAccount = async function() {
        const firstName = document.getElementById('signup-firstname')?.value.trim();
        const lastName = document.getElementById('signup-lastname')?.value.trim();
        const studentId = document.getElementById('signup-studentid')?.value.trim();
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-pwd')?.value.trim();
        const course = document.getElementById('signup-course')?.value.trim();
        const year = document.getElementById('signup-year')?.value.trim();
        const contact = document.getElementById('signup-contact')?.value.trim();

        if (!firstName || !lastName || !email || !password || !course || !studentId) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }
        
        try {
            await api.register({
                first_name: firstName,
                last_name: lastName,
                middle_name: '',
                student_id: studentId,
                email: email,
                password: password,
                course: course,
                year_level: year,
                contact_number: contact
            });
            
            alert('Account created successfully! You can now log in.');
            showAuthPanel('signin');
            
            // Clear form
            ['signup-firstname', 'signup-lastname', 'signup-pwd', 'signup-email', 
             'signup-course', 'signup-year', 'signup-contact', 'signup-studentid'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: ' + error.message);
        }
    };

    // Logout function
    window.logout = async function() {
        await api.logout();
        localStorage.clear();
        location.reload();
    };

    // Toggle login field based on role
    window.toggleLoginField = function() {
        const roleSelect = document.getElementById('login-role');
        const loginLabel = document.getElementById('login-label');
        const loginInput = document.getElementById('login-identifier');
        const demoHint = document.getElementById('demo-hint');
        
        if (!roleSelect) return;
        
        if (roleSelect.value === 'admin') {
            loginLabel.textContent = 'Librarian ID';
            loginInput.placeholder = 'Enter your Librarian ID';
            demoHint.innerHTML = '🔑 Librarian ID: LIB001 | Password: admin123';
        } else {
            loginLabel.textContent = 'Student ID';
            loginInput.placeholder = 'Enter your Student ID';
            demoHint.innerHTML = '🔑 Student ID: 2024-01018 | Password: student123';
        }
    };

    // Initialize auth UI
    window.initAuth = async function() {
        const token = localStorage.getItem('ulitms_token');
        const role = localStorage.getItem('ulitms_role');
        const name = localStorage.getItem('ulitms_name') || 'Guest';
        
        if (!token || !role) {
            const authLanding = document.getElementById('auth-landing');
            if (authLanding) {
                authLanding.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                if (window.toggleLoginField) window.toggleLoginField();
            }
            return;
        }
        
        // Update UI with user info
        const initials = (name.split(' ').map(s => s[0] || '').join('') || 'G').slice(0, 2).toUpperCase();
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const topbarAvatar = document.getElementById('topbar-avatar');
        const sidebarName = document.getElementById('sidebar-user-name');
        const sidebarRole = document.getElementById('sidebar-user-role');
        const topbarName = document.getElementById('topbar-user-name');
        const topbarRole = document.getElementById('topbar-user-role');

        if (sidebarAvatar) sidebarAvatar.textContent = initials;
        if (topbarAvatar) topbarAvatar.textContent = initials;
        if (sidebarName) sidebarName.textContent = name;
        if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Librarian' : 'Student';
        if (topbarName) topbarName.textContent = name;
        if (topbarRole) topbarRole.textContent = role === 'admin' ? 'Librarian' : 'Student';
    };
})();
