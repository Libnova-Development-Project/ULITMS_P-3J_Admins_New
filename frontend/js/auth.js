// ULITMS Authentication System - COMPLETE FIXED VERSION

function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You can implement a nice toast UI here
    alert(message);
}

window.login = async function() {
    const identifier = document.getElementById('signin-identifier')?.value.trim();
    const password = document.getElementById('signin-password')?.value.trim();
    const roleSelect = document.getElementById('signin-role');
    const role = roleSelect?.value === 'admin' ? 'admin' : 'student';
    
    if (!identifier || !password) {
        showToast('Please enter Student ID/Email and password', 'error');
        return;
    }
    
    const btn = event?.target;
    const originalText = btn?.innerHTML;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        btn.disabled = true;
    }
    
    try {
        const result = await window.login(identifier, password, role);
        
        // Force reload to main page
        window.location.href = 'index.html';
    } catch (error) {
        showToast(error.message, 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

window.createAccount = async function() {
    const student_id = document.getElementById('signup-studentid')?.value.trim();
    const first_name = document.getElementById('signup-firstname')?.value.trim();
    const last_name = document.getElementById('signup-lastname')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value.trim();
    const course = document.getElementById('signup-course')?.value.trim();
    const year_level = document.getElementById('signup-year')?.value;
    const contact_number = document.getElementById('signup-contact')?.value.trim();
    
    if (!student_id || !first_name || !last_name || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const btn = event?.target;
    const originalText = btn?.innerHTML;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        btn.disabled = true;
    }
    
    try {
        await window.register({
            student_id,
            first_name,
            last_name,
            email,
            password,
            course: course || null,
            year_level: year_level ? parseInt(year_level) : null,
            contact_number: contact_number || null
        });
        
        showToast('Account created successfully! Please login.', 'success');
        
        // Switch to login panel
        if (typeof showAuthPanel === 'function') {
            showAuthPanel('signin');
        }
        
        // Clear form
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        showToast(error.message, 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

window.showAuthPanel = function(panel) {
    const signin = document.getElementById('signin-panel');
    const signup = document.getElementById('signup-panel');
    const success = document.getElementById('success-panel');
    
    if (signin) signin.style.display = panel === 'signin' ? 'block' : 'none';
    if (signup) signup.style.display = panel === 'signup' ? 'block' : 'none';
    if (success) success.style.display = panel === 'success' ? 'block' : 'none';
};

window.toggleLoginField = function() {
    const roleSelect = document.getElementById('signin-role');
    const loginLabel = document.getElementById('login-label');
    const loginInput = document.getElementById('signin-identifier');
    
    if (roleSelect?.value === 'admin') {
        if (loginLabel) loginLabel.textContent = 'Admin Email';
        if (loginInput) loginInput.placeholder = 'Enter admin email';
    } else {
        if (loginLabel) loginLabel.textContent = 'Student ID / Email';
        if (loginInput) loginInput.placeholder = 'Enter Student ID or Email';
    }
};