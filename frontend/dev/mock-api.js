// In-memory stand-in for the ULITMS backend (same routes and response shapes). For trying the UI without PostgreSQL:
//   npm run mock   (port 3000)   then   npm start   (port 5173)
const http = require('node:http');
const PORT = Number(process.env.PORT || 3000);
const now = () => new Date().toISOString();
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ago = (m) => new Date(Date.now() - m * 6e4).toISOString();

const users = [
  { user_id: 1, student_number: null, first_name: 'Library', last_name: 'Admin', email: 'admin@ulitms.edu', role: 'admin', status: 'active', pw: 'Admin@123' },
  { user_id: 2, student_number: '2026-0001', first_name: 'Juan', last_name: 'Dela Cruz', email: 'juan@ulitms.edu', role: 'student', status: 'active', pw: 'Student@123', course: 'BSIS', year_level: 2 },
  { user_id: 3, student_number: '2026-0002', first_name: 'Maria', last_name: 'Santos', email: 'maria@ulitms.edu', role: 'student', status: 'active', pw: 'Student@123' },
];
const cats = { 1: 'Computer Science', 2: 'Mathematics', 3: 'Literature', 4: 'Reference' };
let books = [
  ['Database System Concepts', 'Silberschatz', 1, 4, 3], ['PostgreSQL: Up and Running', 'Regina Obe', 1, 2, 2], ['Clean Code', 'Robert C. Martin', 1, 3, 0],
  ['Introduction to Algorithms', 'Cormen', 1, 5, 4], ['Calculus: Early Transcendentals', 'James Stewart', 2, 3, 3], ['Linear Algebra Done Right', 'Sheldon Axler', 2, 2, 1],
  ['Noli Me Tangere', 'José Rizal', 3, 6, 5], ['El Filibusterismo', 'José Rizal', 3, 4, 4], ['Merriam-Webster Dictionary', 'Merriam-Webster', 4, 2, 2],
  ['Principles of Accounting', 'Weygandt', 4, 3, 2], ['Systems Analysis and Design', 'Kendall', 1, 3, 3], ['Discrete Mathematics', 'Rosen', 2, 2, 2],
].map((b, i) => ({ book_id: i + 1, isbn: `978-0-${1000 + i}`, title: b[0], author: b[1], publisher: 'Pearson', publication_year: 2010 + i, category_id: b[2], total_copies: b[3], available_copies: b[4], deleted: false }));
let bid = 100;
const loans = [
  { borrow_id: 1, user_id: 2, book_id: 1, status: 'borrowed', requested_at: ago(9000), due_date: day(3), fine_amount: 0, decision_note: 'Enjoy!' },
  { borrow_id: 2, user_id: 2, book_id: 3, status: 'overdue', requested_at: ago(30000), due_date: day(-4), fine_amount: 0 },
  { borrow_id: 3, user_id: 2, book_id: 7, status: 'pending_approval', requested_at: ago(120) },
  { borrow_id: 4, user_id: 3, book_id: 4, status: 'pending_approval', requested_at: ago(45) },
  { borrow_id: 5, user_id: 3, book_id: 5, status: 'approved', requested_at: ago(500), due_date: day(7) },
  { borrow_id: 6, user_id: 3, book_id: 8, status: 'pending_return', requested_at: ago(8000), due_date: day(-2) },
  { borrow_id: 7, user_id: 2, book_id: 9, status: 'returned', requested_at: ago(90000), due_date: day(-30), fine_amount: 20 },
  { borrow_id: 8, user_id: 2, book_id: 10, status: 'rejected', requested_at: ago(70000), decision_note: 'Reserved for a class.' },
];
const units = [
  { unit_id: 1, unit_code: 'PC-01', location: 'E-Library Room A', status: 'available', cpu: 'Core i5', ram_gb: '16' },
  { unit_id: 2, unit_code: 'PC-02', location: 'E-Library Room A', status: 'in_use', cpu: 'Core i5', ram_gb: '16', session_id: 50, current_user_name: 'Maria Santos', time_in: ago(35) },
  { unit_id: 3, unit_code: 'PC-03', location: 'E-Library Room B', status: 'maintenance', cpu: 'Ryzen 5', ram_gb: '8' },
  { unit_id: 4, unit_code: 'PC-04', location: 'E-Library Room B', status: 'available', cpu: 'Ryzen 5', ram_gb: '8' },
];
let reports = [{ report_id: 1, severity: 'moderate', status: 'open', damage_type: 'Cracked screen', description: 'Hairline crack in the lower-left corner.', reported_at: ago(300), reported_by_name: 'Maria Santos', unit_code: 'PC-03', peripheral_name: null }];
let notes = [
  { notification_id: 1, user_id: 2, type: 'borrow', title: 'Request approved', message: 'Database System Concepts is ready. Due in 3 days.', is_read: false, created_at: ago(60) },
  { notification_id: 2, user_id: 2, type: 'borrow', title: 'Request declined', message: 'Principles of Accounting: reserved for a class.', is_read: true, created_at: ago(7000) },
  { notification_id: 3, user_id: 1, type: 'borrow', title: 'New borrow request', message: 'Maria Santos requested Introduction to Algorithms.', is_read: false, created_at: ago(45) },
];
const audit = Array.from({ length: 120 }, (_, i) => ({ audit_id: 1000 - i, changed_at: ago(i * 20), table_name: ['books', 'borrow_transactions', 'users'][i % 3], record_id: (i % 9) + 1, operation: ['UPDATE', 'INSERT', 'UPDATE'][i % 3], app_user_id: 1, changed_by_user: 'Library Admin', db_role: 'app_user',
  old_data: i % 3 === 1 ? null : { status: 'pending_approval', available_copies: 4, updated_at: 'x' }, new_data: { status: i % 3 === 1 ? 'pending_approval' : 'approved', available_copies: 3, updated_at: 'y', title: 'Demo' } }));

const name = (u) => `${u.first_name} ${u.last_name}`;
const L = (l) => { const b = books.find((x) => x.book_id === l.book_id); const u = users.find((x) => x.user_id === l.user_id); return { b, u }; };
const ok = (data, status = 200) => [status, { success: true, data }];
const fail = (status, message, details) => [status, { success: false, error: { message, details } }];
const tokens = new Map();

function handle(method, path, q, body, me) {
  const m = (re) => path.match(re);
  const admin = me?.role === 'admin';
  if (path === '/health') return ok({ status: 'ok', db_user: 'mock', schema: 'library' });
  if (method === 'POST' && path === '/auth/login') {
    const u = users.find((x) => x.email === body.email?.toLowerCase());
    if (!u || u.pw !== body.password || u.status !== 'active') return fail(401, 'Invalid email or password');
    const t = 'tok' + u.user_id; tokens.set(t, u); return ok({ token: t, role: u.role, user_id: u.user_id });
  }
  if (method === 'POST' && path === '/auth/register') {
    if (!body.email?.includes('@') || (body.password || '').length < 8) return fail(400, 'Validation failed', { formErrors: [], fieldErrors: { password: ['String must contain at least 8 character(s)'] } });
    if (users.some((u) => u.email === body.email.toLowerCase())) return fail(409, 'Email already registered');
    users.push({ user_id: users.length + 1, ...body, email: body.email.toLowerCase(), role: 'student', status: 'active', pw: body.password }); return ok({ user_id: users.length }, 201);
  }
  if (!me) return fail(401, 'Missing or invalid token');
  if (path === '/auth/me') { const { pw, ...u } = me; return ok(u); }
  if (path === '/books' && method === 'GET') {
    const k = (q.keyword || '').toLowerCase();
    return ok(books.filter((b) => !b.deleted && (!q.category_id || b.category_id === +q.category_id) && (!k || `${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(k)))
      .map((b) => ({ out_book_id: b.book_id, out_isbn: b.isbn, out_title: b.title, out_author: b.author, out_category_name: cats[b.category_id], out_available_copies: b.available_copies, out_total_copies: b.total_copies })));
  }
  let r;
  if ((r = m(/^\/books\/(\d+)$/))) {
    const b = books.find((x) => x.book_id === +r[1] && !x.deleted);
    if (!b) return fail(404, 'Book not found');
    if (method === 'GET') return ok({ ...b, category_name: cats[b.category_id], is_available: b.available_copies > 0 });
    if (!admin) return fail(403, 'Insufficient permissions');
    if (method === 'DELETE') { b.deleted = true; return ok({ deleted: true, book_id: b.book_id }); }
    if (method === 'PUT') { const d = body.total_copies != null ? body.total_copies - b.total_copies : 0; Object.assign(b, body); b.available_copies += d; return ok(b); }
  }
  if (method === 'POST' && path === '/books') { if (!admin) return fail(403, 'Insufficient permissions'); const b = { book_id: ++bid, ...body, available_copies: body.total_copies ?? 1, total_copies: body.total_copies ?? 1 }; books.push(b); return ok(b, 201); }
  if (method === 'POST' && path === '/borrowings') {
    const b = books.find((x) => x.book_id === body.book_id);
    if (!b || b.available_copies < 1) return fail(409, 'No copy available');
    if (loans.some((l) => l.user_id === me.user_id && l.book_id === b.book_id && ['pending_approval', 'approved', 'borrowed'].includes(l.status))) return fail(409, 'You already have an open request for this book');
    const l = { borrow_id: loans.length + 1, user_id: me.user_id, book_id: b.book_id, status: 'pending_approval', requested_at: now() }; loans.push(l); return ok({ borrow_id: l.borrow_id }, 201);
  }
  if (path === '/borrowings/mine') return ok(loans.filter((l) => l.user_id === me.user_id).sort((a, b) => b.requested_at.localeCompare(a.requested_at)).map((l) => ({ out_borrow_id: l.borrow_id, out_title: L(l).b.title, out_status: l.status, out_requested_at: l.requested_at, out_due_date: l.due_date || null, out_decision_note: l.decision_note || null, out_fine_amount: l.fine_amount ?? 0 })));
  if (!admin && /^\/(borrowings\/(pending|active|mark-overdue)|dashboard|users|reports|audit-logs|damage-reports$)/.test(path) && !(method === 'POST' && path === '/damage-reports')) return fail(403, 'Insufficient permissions');
  if (path === '/borrowings/pending') return ok(loans.filter((l) => l.status === 'pending_approval').map((l) => ({ out_borrow_id: l.borrow_id, out_requested_at: l.requested_at, out_student_number: L(l).u.student_number, out_student_name: name(L(l).u), out_book_id: l.book_id, out_title: L(l).b.title, out_available_copies: L(l).b.available_copies })));
  if (path === '/borrowings/active') return ok(loans.filter((l) => ['approved', 'borrowed', 'pending_return', 'overdue'].includes(l.status)).map((l) => { const od = Math.max(0, Math.floor((Date.now() - new Date(l.due_date)) / 864e5)); return { borrow_id: l.borrow_id, status: l.status, student_number: L(l).u.student_number, student_name: name(L(l).u), title: L(l).b.title, due_date: l.due_date, days_overdue: od, projected_fine: od * 10 }; }));
  if (method === 'POST' && path === '/borrowings/mark-overdue') return ok({ updated: 0 });
  if ((r = m(/^\/borrowings\/(\d+)\/(decision|issue|return-request|confirm-return)$/))) {
    const l = loans.find((x) => x.borrow_id === +r[1]); if (!l) return fail(404, 'Borrow record not found');
    if (r[2] === 'decision') { if (l.status !== 'pending_approval') return fail(409, 'Request already decided'); if (body.decision === 'approve') { l.status = 'approved'; l.due_date = day(body.loan_days || 7); L(l).b.available_copies--; } else l.status = 'rejected'; l.decision_note = body.note; return ok({ borrow_id: l.borrow_id, decision: body.decision }); }
    if (r[2] === 'issue') { l.status = 'borrowed'; return ok({ borrow_id: l.borrow_id, status: 'borrowed' }); }
    if (r[2] === 'return-request') { l.status = 'pending_return'; return ok({ borrow_id: l.borrow_id, status: 'pending_return' }); }
    const od = Math.max(0, Math.floor((Date.now() - new Date(l.due_date)) / 864e5)); l.status = 'returned'; l.fine_amount = od * 10; L(l).b.available_copies++; return ok({ borrow_id: l.borrow_id, status: 'returned', fine_amount: l.fine_amount });
  }
  if (path === '/elibrary/units') return ok(admin ? units : units.map(({ current_user_name, ...u }) => u));
  if (method === 'POST' && path === '/elibrary/sessions') { const u = units.find((x) => x.unit_id === body.unit_id); if (!u || u.status !== 'available') return fail(409, 'Unit is taken'); Object.assign(u, { status: 'in_use', session_id: 60 + u.unit_id, time_in: now(), current_user_name: name(me) }); return ok({ session_id: u.session_id }, 201); }
  if ((r = m(/^\/elibrary\/sessions\/(\d+)\/end$/))) { const u = units.find((x) => x.session_id === +r[1]); if (!u) return fail(404, 'No active session'); Object.assign(u, { status: 'available', session_id: null, time_in: null, current_user_name: null }); return ok({ session_id: +r[1], status: 'ended' }); }
  if (method === 'POST' && path === '/damage-reports') { const u = units.find((x) => x.unit_id === body.unit_id); reports.push({ report_id: reports.length + 1, severity: body.severity || null, status: 'open', damage_type: body.damage_type, description: body.description, reported_at: now(), reported_by_name: name(me), unit_code: u?.unit_code, peripheral_name: null }); return ok({ report_id: reports.length }, 201); }
  if (path === '/damage-reports') return ok(reports);
  if ((r = m(/^\/damage-reports\/(\d+)\/resolve$/))) { reports = reports.filter((x) => x.report_id !== +r[1]); return ok({ report_id: +r[1], status: body.status }); }
  if (path === '/users' && method === 'GET') return ok(users.map((u) => ({ user_id: u.user_id, student_number: u.student_number, full_name: name(u), role: u.role, status: u.status, total_borrowings: loans.filter((l) => l.user_id === u.user_id).length, open_loans: loans.filter((l) => l.user_id === u.user_id && ['approved', 'borrowed', 'overdue', 'pending_return'].includes(l.status)).length, total_fines: loans.filter((l) => l.user_id === u.user_id).reduce((a, l) => a + (l.fine_amount || 0), 0), total_sessions: 2, reports_filed: 0 })));
  if ((r = m(/^\/users\/(\d+)$/))) { const u = users.find((x) => x.user_id === +r[1]); if (!u) return fail(404, 'User not found'); if (method === 'PUT') { Object.assign(u, body); return ok(u); } return ok({ deleted: true, user_id: u.user_id }); }
  if (path === '/notifications') return ok(notes.filter((n) => n.user_id === me.user_id));
  if ((r = m(/^\/notifications\/(\d+)\/read$/))) { const n = notes.find((x) => x.notification_id === +r[1] && x.user_id === me.user_id); if (!n) return fail(404, 'Notification not found'); n.is_read = true; return ok(n); }
  if (path === '/dashboard') return ok({ total_books: books.length, available_copies: books.reduce((a, b) => a + b.available_copies, 0), pending_requests: loans.filter((l) => l.status === 'pending_approval').length, active_borrowings: 2, overdue_borrowings: 1, pending_returns: 1, units_available: units.filter((u) => u.status === 'available').length, units_in_use: units.filter((u) => u.status === 'in_use').length, open_damage_reports: reports.length });
  if (path === '/reports/inventory') return ok(books.map((b) => ({ book_id: b.book_id, title: b.title, total_copies: b.total_copies, available_copies: b.available_copies, copies_allocated: b.total_copies - b.available_copies + (b.book_id === 6 ? 1 : 0), consistent: b.book_id !== 6 })));
  if (path === '/audit-logs') { let a = audit.filter((x) => (!q.table || x.table_name === q.table) && (!q.operation || x.operation === q.operation) && (!q.record_id || x.record_id === +q.record_id)); return ok(a.slice(+(q.offset || 0), +(q.offset || 0) + +(q.limit || 50))); }
  return fail(404, 'Route not found');
}

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = ''; req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x'); const path = url.pathname.replace(/^\/api/, '');
    const me = tokens.get((req.headers.authorization || '').replace('Bearer ', '')) || (req.headers.authorization ? users.find((u) => 'tok' + u.user_id === req.headers.authorization.replace('Bearer ', '')) : null);
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { /* */ }
    const [status, json] = handle(req.method, path, Object.fromEntries(url.searchParams), body, me);
    res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(json));
  });
}).listen(PORT, () => console.log(`Mock ULITMS API: http://localhost:${PORT}/api  (admin@ulitms.edu / Admin@123, juan@ulitms.edu / Student@123)`));
