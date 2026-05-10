// ULITMS Authentication System
(function() {

function showToast(message, type) {
    console.log([\] \);
    alert(message);
}

window.login = async function() {
    const identifier = document.getElementById('signin-identifier')?.value.trim();
    const password = document.getElementById('signin-password')?.value.trim();
    const role = document.getElementById('signin-role')?.value || 'student';
    
    if (!identifier || !password) {
        alert('Please enter Student ID/Email and password');
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
        alert(Welcome back, \!);
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    } finally {
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
        alert('Please fill in all required fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
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
            student_id, first_name, last_name, email, password,
            course: course || null,
            year_level: year_level ? parseInt(year_level) : null,
            contact_number: contact_number || null
        });
        alert('Account created successfully! Please login.');
        if (typeof showAuthPanel === 'function') {
            showAuthPanel('signin');
        }
    } catch (error) {
        alert(error.message);
    } finally {
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
    if (signin) signin.style.display = panel === 'signin' ? 'block' : 'none';
    if (signup) signup.style.display = panel === 'signup' ? 'block' : 'none';
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
})();
