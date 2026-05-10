// ULITMS Authentication System
(function(){

  // Get stored user data
  function getToken() { return localStorage.getItem('ulitms_token'); }
  function getRole() { return localStorage.getItem('ulitms_role'); }
  function getName() { return localStorage.getItem('ulitms_name') || 'Guest'; }
  function getStudentId() { return localStorage.getItem('ulitms_studentid') || ''; }
  function isLoggedIn() { return !!getToken() && !!getRole(); }

  // === LOGIN FUNCTION ===
  window.login = async function(){
    const identifier = document.getElementById('signin-identifier')?.value.trim();
    const password = document.getElementById('signin-password')?.value.trim();
    const roleSelect = document.getElementById('signin-role');
    const role = roleSelect?.value || 'student';
    
    if (!identifier || !password) {
      alert('Please enter Student ID/Email and password');
      return;
    }
    
    // Show loading state
    const loginBtn = document.querySelector('#signin-panel .btn-primary');
    const originalText = loginBtn?.innerHTML;
    if (loginBtn) {
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      loginBtn.disabled = true;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Store user data
        localStorage.setItem('ulitms_token', data.token);
        localStorage.setItem('ulitms_role', data.user.role);
        localStorage.setItem('ulitms_name', data.user.name);
        localStorage.setItem('ulitms_email', data.user.email);
        localStorage.setItem('ulitms_studentid', data.user.student_id || '');
        localStorage.setItem('ulitms_course', data.user.course || '');
        localStorage.setItem('ulitms_year', data.user.year_level || '');
        localStorage.setItem('ulitms_contact', data.user.contact_number || '');
        
        // Show success message
        alert(`Welcome back, ${data.user.name}!`);
        
        // Redirect to dashboard
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Cannot connect to server. Make sure backend is running on port 8080');
    } finally {
      if (loginBtn) {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
      }
    }
  };

  // === REGISTER FUNCTION ===
  window.createAccount = async function(){
    const student_id = document.getElementById('signup-studentid')?.value.trim();
    const first_name = document.getElementById('signup-firstname')?.value.trim();
    const last_name = document.getElementById('signup-lastname')?.value.trim();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value.trim();
    const course = document.getElementById('signup-course')?.value.trim();
    const year_level = document.getElementById('signup-year')?.value;
    const contact_number = document.getElementById('signup-contact')?.value.trim();

    // Validation
    if (!student_id) { alert('Student ID is required'); return; }
    if (!first_name) { alert('First name is required'); return; }
    if (!last_name) { alert('Last name is required'); return; }
    if (!email) { alert('Email is required'); return; }
    if (!password) { alert('Password is required'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    if (!course) { alert('Course is required'); return; }
    if (!year_level) { alert('Year level is required'); return; }

    // Show loading state
    const registerBtn = document.querySelector('#signup-panel .btn-primary');
    const originalText = registerBtn?.innerHTML;
    if (registerBtn) {
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
      registerBtn.disabled = true;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id,
          first_name,
          last_name,
          email,
          password,
          course,
          year_level: parseInt(year_level),
          contact_number: contact_number || null
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Account created successfully! Please login with your Student ID.');
        showAuthPanel('signin');
        // Clear form
        document.getElementById('signup-studentid').value = '';
        document.getElementById('signup-firstname').value = '';
        document.getElementById('signup-lastname').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-course').value = '';
        document.getElementById('signup-contact').value = '';
      } else {
        alert(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Cannot connect to server. Make sure backend is running on port 8080');
    } finally {
      if (registerBtn) {
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
      }
    }
  };

  // === LOGOUT FUNCTION ===
  window.logout = function(){
    if (confirm('Are you sure you want to logout?')) {
      // Clear all localStorage items
      localStorage.removeItem('ulitms_token');
      localStorage.removeItem('ulitms_role');
      localStorage.removeItem('ulitms_name');
      localStorage.removeItem('ulitms_email');
      localStorage.removeItem('ulitms_studentid');
      localStorage.removeItem('ulitms_course');
      localStorage.removeItem('ulitms_year');
      localStorage.removeItem('ulitms_contact');
      
      // Redirect to login page
      window.location.href = 'login.html';
    }
  };

  // Show/hide auth panels
  window.showAuthPanel = function(panel){
    const signin = document.getElementById('signin-panel');
    const signup = document.getElementById('signup-panel');
    const success = document.getElementById('success-panel');
    
    if (signin) signin.style.display = panel === 'signin' ? 'block' : 'none';
    if (signup) signup.style.display = panel === 'signup' ? 'block' : 'none';
    if (success) success.style.display = panel === 'success' ? 'block' : 'none';
  };

  // Initialize auth on page load (update UI with user info)
  window.initAuth = function(){
    const role = getRole();
    const name = getName();
    const studentId = getStudentId();
    
    // Update sidebar user info
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    const topbarAvatar = document.getElementById('topbar-avatar');
    const topbarName = document.getElementById('topbar-user-name');
    const topbarRole = document.getElementById('topbar-user-role');
    
    const initials = name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
    
    if (sidebarAvatar) sidebarAvatar.textContent = initials || 'U';
    if (topbarAvatar) topbarAvatar.textContent = initials || 'U';
    if (sidebarName) sidebarName.textContent = name;
    if (topbarName) topbarName.textContent = name;
    
    if (role === 'admin') {
      if (sidebarRole) sidebarRole.textContent = 'Administrator';
      if (topbarRole) topbarRole.textContent = 'Administrator';
    } else {
      if (sidebarRole) sidebarRole.textContent = `Student (${studentId})`;
      if (topbarRole) topbarRole.textContent = `Student`;
    }
    
    // Show/hide admin-only items
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = role === 'admin' ? 'flex' : 'none';
    });
  };

  // === AUTO-REDIRECT LOGIC ===
  const isLoginPage = window.location.pathname.includes('login.html');
  const loggedIn = isLoggedIn();
  
  if (isLoginPage && loggedIn) {
    // If logged in and on login page, redirect to dashboard
    window.location.href = 'index.html';
  } else if (!isLoginPage && !loggedIn && !window.location.pathname.includes('login.html')) {
    // If not logged in and not on login page, redirect to login
    window.location.href = 'login.html';
  }
  
  // Clear stale data on login page
  if (isLoginPage) {
    localStorage.removeItem('ulitms_token');
    localStorage.removeItem('ulitms_role');
  }
})();