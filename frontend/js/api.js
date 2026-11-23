/* ULITMS Frontend API Client — compatible with the MVC backend */
(function () {
  const API_BASE_URL = (window.ULITMS_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

  function getAuthToken() { return localStorage.getItem('ulitms_token'); }
  function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('ulitms_user') || 'null'); }
    catch (_) { return null; }
  }
  function storeAuth(payload) {
    const data = payload && payload.data ? payload.data : payload;
    const token = data && data.token;
    const user = data && data.user;
    if (!token || !user) throw new Error('Login response did not include a user and token.');
    localStorage.setItem('ulitms_token', token);
    localStorage.setItem('ulitms_user', JSON.stringify(user));
    localStorage.setItem('ulitms_user_id', user.user_id ?? user.id ?? '');
    localStorage.setItem('ulitms_role', user.role || '');
    localStorage.setItem('ulitms_name', [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User');
    localStorage.setItem('ulitms_email', user.email || '');
    localStorage.setItem('ulitms_studentid', user.student_number || user.student_id || '');
    localStorage.setItem('ulitms_avatar', user.profile_picture || '');
    return { user, token };
  }
  function clearAuth() {
    ['ulitms_token','ulitms_user','ulitms_user_id','ulitms_role','ulitms_name','ulitms_email','ulitms_studentid','ulitms_avatar','ulitms_remember'].forEach(k => localStorage.removeItem(k));
  }
  async function apiRequest(endpoint, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const token = getAuthToken();
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, { ...options, headers });
    } catch (err) {
      throw new Error(`Cannot reach the ULITMS API at ${API_BASE_URL}. Check that the backend is running. ${err.message || ''}`.trim());
    }
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await response.json() : { message: await response.text() };
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || payload.error || `Request failed (${response.status})`);
      error.status = response.status; error.payload = payload;
      if (response.status === 401 && getAuthToken()) {
        clearAuth();
        if (!/login|admin-login/i.test(location.pathname)) {
          const base = location.pathname.includes('/pages/') ? '../' : '';
          location.href = `${base}login.html`;
        }
      }
      throw error;
    }
    return payload.data !== undefined ? payload.data : payload;
  }
  const qs = obj => {
    const p = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
    const s = p.toString(); return s ? `?${s}` : '';
  };

  window.API_BASE_URL = API_BASE_URL;
  window.apiRequest = apiRequest;
  window.getAuthToken = getAuthToken;
  window.setAuth = storeAuth;
  window.clearAuth = clearAuth;
  window.getStoredUser = getStoredUser;

  window.login = async (email, password, expectedRole) => {
    const payload = await fetch(`${API_BASE_URL}/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ email, password })
    }).then(async r => { const d=await r.json(); if(!r.ok || d.success===false) throw new Error(d.message || 'Login failed'); return d; });
    const auth = storeAuth(payload);
    if (expectedRole && auth.user.role !== expectedRole) { clearAuth(); throw new Error('This account does not have administrator access.'); }
    return auth;
  };
  window.register = async userData => apiRequest('/auth/register', { method:'POST', body:JSON.stringify(userData) });
  window.logout = async () => {
    try { if (getAuthToken()) await apiRequest('/auth/logout', { method:'POST' }); } catch (_) {}
    clearAuth(); location.href = location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
  };

  // Books and categories
  window.fetchBooks = async filters => apiRequest(`/books${qs(filters)}`);
  window.fetchBookById = async id => apiRequest(`/books/${id}`).then(x=>x.book||x);
  window.createBook = async body => apiRequest('/books',{method:'POST',body:JSON.stringify(body)}).then(x=>x.book||x);
  window.updateBook = async (id,body) => apiRequest(`/books/${id}`,{method:'PUT',body:JSON.stringify(body)}).then(x=>x.book||x);
  window.deleteBook = id => apiRequest(`/books/${id}`,{method:'DELETE'});
  window.searchBooks = q => apiRequest(`/books/search${qs({search:q})}`);
  window.fetchBookCategories = async (all=false) => apiRequest(all?'/book-categories/all':'/book-categories').then(x=>x.categories||x);
  window.setBookCategoryStatus = (id,status) => apiRequest(`/book-categories/${id}/status`,{method:'PUT',body:JSON.stringify({status})});

  // Borrowing workflow: request -> approve/reserve -> issue -> return request -> admin confirmation.
  window.fetchMyBorrowings = async () => {
    const id = localStorage.getItem('ulitms_user_id');
    if (!id) throw new Error('User is not signed in.');
    return apiRequest(`/borrowings/user/${id}`).then(x=>x.borrowings||x);
  };
  window.fetchAllBorrowings = (limit=100,offset=0,status=null) => apiRequest(`/borrowings${qs({limit,offset,status})}`);
  window.fetchOverdueBooks = () => apiRequest('/borrowings/overdue').then(x=>x.overdue||x);
  window.fetchPendingBorrowings = () => apiRequest('/borrowings/pending').then(x=>x.borrowings||x);
  window.borrowBook = bookId => apiRequest('/borrowings',{method:'POST',body:JSON.stringify({book_id:Number(bookId)})}).then(x=>x.borrowing||x);
  window.requestBookReturn = id => apiRequest(`/borrowings/${id}/return`,{method:'PUT'});
  window.returnBook = window.requestBookReturn;
  window.confirmReturn = id => apiRequest(`/borrowings/${id}/confirm`,{method:'PUT'});
  window.approveBorrowing = (id,note='') => apiRequest(`/borrowings/${id}/approve`,{method:'PUT',body:JSON.stringify({decision_note:note})});
  window.rejectBorrowing = (id,reason='') => apiRequest(`/borrowings/${id}/reject`,{method:'PUT',body:JSON.stringify({reason})});
  window.issueBorrowing = id => apiRequest(`/borrowings/${id}/issue`,{method:'PUT'});
  window.markBorrowingLost = (id,note='') => apiRequest(`/borrowings/${id}/lost`,{method:'PUT',body:JSON.stringify({note})});
  window.markOverdueBorrowings = () => apiRequest('/borrowings/mark-overdue',{method:'POST'});

  // Users and current profile
  window.fetchCurrentUser = () => apiRequest('/auth/me').then(x=>x.user||x);
  window.fetchUserProfile = id => id ? apiRequest(`/users/${id}`).then(x=>x.user||x) : window.fetchCurrentUser();
  window.fetchAllUsers = (limit=100,offset=0,filters={}) => apiRequest(`/users${qs({limit,offset,...filters})}`);
  window.updateUserProfile = (id,body) => apiRequest(`/users/${id}`,{method:'PUT',body:JSON.stringify(body)}).then(x=>x.user||x);
  window.updateCurrentProfile = body => apiRequest('/users/'+localStorage.getItem('ulitms_user_id'),{method:'PUT',body:JSON.stringify(body)}).then(x=>x.user||x);
  window.changePassword = (id,currentPassword,newPassword) => apiRequest(`/users/${id}/password`,{method:'PUT',body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
  window.changeMyPassword = (currentPassword,newPassword) => apiRequest('/profile/password',{method:'PUT',body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
  window.deleteUser = id => apiRequest(`/users/${id}`,{method:'DELETE'});
  window.setUserStatus = (id,status) => apiRequest(`/users/${id}/status`,{method:'PUT',body:JSON.stringify({status})});
  window.fetchUserStats = id => apiRequest(`/users/${id}/stats`);

  // E-library
  window.fetchELibraryUnits = () => apiRequest('/elibrary/units').then(x=>x.units||x);
  window.fetchUnitById = id => apiRequest(`/elibrary/units/${id}`).then(x=>x.unit||x);
  window.createELibraryUnit = body => apiRequest('/elibrary/units',{method:'POST',body:JSON.stringify(body)}).then(x=>x.unit||x);
  window.updateELibraryUnit = (id,body) => apiRequest(`/elibrary/units/${id}`,{method:'PUT',body:JSON.stringify(body)}).then(x=>x.unit||x);
  window.deleteELibraryUnit = id => apiRequest(`/elibrary/units/${id}`,{method:'DELETE'});
  window.fetchUserSessions = () => apiRequest(`/elibrary/sessions/user/${localStorage.getItem('ulitms_user_id')}`).then(x=>x.sessions||x);
  window.fetchAllSessions = (limit=100,offset=0,active=false) => apiRequest(`/elibrary/sessions${qs({limit,offset,active:active?'true':undefined})}`).then(x=>x.sessions||x);
  window.fetchActiveSessions = () => apiRequest('/elibrary/sessions/active').then(x=>x.sessions||x);
  window.startSession = (unitId,purpose='') => apiRequest('/elibrary/sessions/start',{method:'POST',body:JSON.stringify({unit_id:Number(unitId),purpose})}).then(x=>x.session||x);
  window.endSession = id => apiRequest(`/elibrary/sessions/${id}/end`,{method:'PUT'}).then(x=>x.session||x);

  // Peripherals
  window.fetchPeripherals = (unitId=null,limit=100,offset=0) => apiRequest(`/peripherals${qs({unit_id:unitId,limit,offset})}`);
  window.fetchPeripheralById = id => apiRequest(`/peripherals/${id}`).then(x=>x.peripheral||x);
  window.createPeripheral = body => apiRequest('/peripherals',{method:'POST',body:JSON.stringify(body)}).then(x=>x.peripheral||x);
  window.updatePeripheral = (id,body) => apiRequest(`/peripherals/${id}`,{method:'PUT',body:JSON.stringify(body)}).then(x=>x.peripheral||x);
  window.updatePeripheralCondition = (id,condition) => apiRequest(`/peripherals/${id}/condition`,{method:'PUT',body:JSON.stringify({condition})}).then(x=>x.peripheral||x);
  window.deletePeripheral = id => apiRequest(`/peripherals/${id}`,{method:'DELETE'});
  window.fetchPeripheralCategories = () => apiRequest('/peripherals/categories').then(x=>x.categories||x);
  window.createPeripheralCategory = (name,description='') => apiRequest('/peripherals/categories',{method:'POST',body:JSON.stringify({name,description})}).then(x=>x.category||x);

  // Damage reports
  window.fetchDamageReports = (limit=100,offset=0,status=null,severity=null) => apiRequest(`/damage-reports${qs({limit,offset,status,severity})}`);
  window.fetchMyDamageReports = () => apiRequest('/damage-reports/mine').then(x=>x.reports||x);
  window.fetchDamageReportById = id => apiRequest(`/damage-reports/${id}`).then(x=>x.report||x);
  window.createDamageReport = body => apiRequest('/damage-reports',{method:'POST',body:JSON.stringify(body)}).then(x=>x.report||x);
  window.updateDamageReportStatus = (id,status,resolution_notes='') => apiRequest(`/damage-reports/${id}/status`,{method:'PUT',body:JSON.stringify({status,resolution_notes})}).then(x=>x.report||x);
  window.resolveDamageReport = (id,notes='') => window.updateDamageReportStatus(id,'resolved',notes);
  window.fetchDamageReportStats = () => apiRequest('/damage-reports/stats');

  // Notifications
  window.fetchNotifications = () => apiRequest('/notifications').then(x=>x.notifications||x);
  window.markNotificationRead = id => apiRequest(`/notifications/${id}/mark-read`,{method:'PUT'});
  window.markAllNotificationsRead = () => apiRequest('/notifications/mark-all-read',{method:'PUT'});

  window.utils = window.utils || {
    showNotification(message,type='info',duration=3000) {
      const el=document.createElement('div'); el.className=`notification notification-${type}`; el.textContent=message;
      el.style.cssText=`position:fixed;top:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:8px;color:#fff;background:${type==='success'?'#059669':type==='error'?'#dc2626':'#2563eb'};box-shadow:0 5px 20px #0002`;
      document.body.appendChild(el); setTimeout(()=>el.remove(),duration);
    },
    formatDate(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
  };

  // Compatibility adapters used by existing page scripts.
  window.setToken = token => localStorage.setItem('ulitms_token', token);
  window.getToken = getAuthToken;
  window.removeToken = clearAuth;
  window.isAuthenticated = () => !!getAuthToken();
  window.booksAPI = {
    getBooks: async params => { const x=await window.fetchBooks(params); return x.books || x; },
    getBook: window.fetchBookById, createBook:window.createBook, updateBook:window.updateBook,
    deleteBook:window.deleteBook, getCategories:window.fetchBookCategories
  };
  window.usersAPI = {
    getUsers: async params => { const x=await window.fetchAllUsers(params?.limit||100,params?.offset||0,params); return x.users||x; },
    getUser:window.fetchUserProfile, createUser:async body=>apiRequest('/users',{method:'POST',body:JSON.stringify(body)}).then(x=>x.user||x),
    updateUser:window.updateUserProfile, deleteUser:window.deleteUser,
    toggleUserStatus:(id,active)=>window.setUserStatus(id,active?'active':'inactive')
  };
  window.elibraryAPI = {
    getUnits:window.fetchELibraryUnits,getUnit:window.fetchUnitById,createUnit:window.createELibraryUnit,
    updateUnit:window.updateELibraryUnit,deleteUnit:window.deleteELibraryUnit,
    startSession:window.startSession,endSession:window.endSession,getAllSessions:window.fetchAllSessions,
    getActiveSessions:window.fetchActiveSessions,getUserSessions:window.fetchUserSessions
  };
  window.peripheralsAPI = {
    getPeripherals:async params=>{const x=await apiRequest(`/peripherals${qs(params)}`);return x.peripherals||x;},
    getPeripheral:window.fetchPeripheralById,createPeripheral:window.createPeripheral,
    updatePeripheral:window.updatePeripheral,deletePeripheral:window.deletePeripheral,
    getCategories:window.fetchPeripheralCategories,createCategory:async data=>window.createPeripheralCategory(data.name,data.description)
  };
  window.authAPI = { login:async credentials=>{const a=await window.login(credentials.email,credentials.password);return {success:true,data:a};},logout:window.logout,getCurrentUser:getStoredUser };

  console.info('ULITMS API client ready:', API_BASE_URL);
})();
