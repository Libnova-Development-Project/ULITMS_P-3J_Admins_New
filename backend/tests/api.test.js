// Integration test: real HTTP -> Express -> PostgreSQL functions/procedures/triggers.
// Run on a FRESH database:  npm test
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let base; let server;
const tok = {};
test.before(async () => { server = app.listen(0); base = `http://localhost:${server.address().port}/api`; });
test.after(async () => { server.close(); await pool.end(); });

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}
const expect = (r, status, msgPart) => {
  assert.equal(r.status, status, JSON.stringify(r.json));
  if (msgPart) assert.match(JSON.stringify(r.json), new RegExp(msgPart, 'i'));
};

test('health + auth', async () => {
  expect(await api('GET', '/health'), 200);
  assert.equal((await api('GET', '/health')).json.data.db_user, 'app_user');
  expect(await api('GET', '/books'), 401);                                             // no token
  expect(await api('POST', '/auth/login', { body: { email: 'juan@ulitms.edu', password: 'wrong' } }), 401);
  for (const [k, email, pw] of [['admin', 'admin@ulitms.edu', 'Admin@123'], ['juan', 'juan@ulitms.edu', 'Student@123'], ['maria', 'maria@ulitms.edu', 'Student@123']]) {
    const r = await api('POST', '/auth/login', { body: { email, password: pw } });
    expect(r, 200); tok[k] = r.json.data.token;
  }
  const me = await api('GET', '/auth/me', { token: tok.juan });
  assert.equal(me.json.data.role, 'student');
  assert.ok(!('password_hash' in me.json.data));
});

test('register: validation, success, duplicate', async () => {
  expect(await api('POST', '/auth/register', { body: { email: 'bad' } }), 400, 'Validation failed');
  const body = { student_number: '2026-0100', first_name: ' Ana ', last_name: 'Reyes', email: 'ANA@ulitms.edu', password: 'Secret123!', year_level: 2 };
  expect(await api('POST', '/auth/register', { body }), 201);
  expect(await api('POST', '/auth/register', { body }), 409, 'already registered');   // unique -> readable 409
  expect(await api('POST', '/auth/login', { body: { email: 'ana@ulitms.edu', password: 'Secret123!' } }), 200); // sanitized email works
});

test('role protection', async () => {
  expect(await api('GET', '/dashboard', { token: tok.juan }), 403);
  expect(await api('POST', '/books', { token: tok.juan, body: { title: 'x', author: 'y' } }), 403);
  expect(await api('GET', '/audit-logs', { token: tok.juan }), 403);
  expect(await api('GET', '/dashboard', { token: tok.admin }), 200);
});

test('books: search function, CRUD in transaction, soft delete, triggers', async () => {
  const s = await api('GET', '/books?keyword=postgres', { token: tok.juan });
  expect(s, 200); assert.equal(s.json.data.length, 1);
  // SQL injection attempt is treated as plain text by the parameterized function call
  const inj = await api('GET', "/books?keyword=" + encodeURIComponent("'; DROP TABLE library.books; --"), { token: tok.juan });
  expect(inj, 200); assert.equal(inj.json.data.length, 0);
  assert.equal((await api('GET', '/books', { token: tok.juan })).json.data.length, 6);   // table still intact
  const c = await api('POST', '/books', { token: tok.admin, body: { title: 'Clean Code', author: 'R. Martin', total_copies: 2, isbn: '9780132350884' } });
  expect(c, 201); const bid = c.json.data.book_id;
  expect(await api('POST', '/books', { token: tok.admin, body: { title: 'Dup', author: 'x', isbn: '9780132350884' } }), 409);
  const u = await api('PUT', `/books/${bid}`, { token: tok.admin, body: { total_copies: 5 } });
  expect(u, 200); assert.equal(u.json.data.available_copies, 5);                      // trg_books_adjust_available
  expect(await api('GET', '/books/abc', { token: tok.admin }), 400);
  const d = await api('DELETE', `/books/${bid}`, { token: tok.admin });
  expect(d, 200); assert.equal(d.json.data.deleted, true);
  expect(await api('GET', `/books/${bid}`, { token: tok.admin }), 404);
});

test('borrow workflow incl. rollback path on last copy + fine', async () => {
  // Book 3 has ONE copy. Juan and Maria both request it.
  const r1 = await api('POST', '/borrowings', { token: tok.juan, body: { book_id: 3 } }); expect(r1, 201);
  const r2 = await api('POST', '/borrowings', { token: tok.maria, body: { book_id: 3 } }); expect(r2, 201);
  expect(await api('POST', '/borrowings', { token: tok.juan, body: { book_id: 3 } }), 409, 'already have an open');
  const b1 = r1.json.data.borrow_id; const b2 = r2.json.data.borrow_id;

  const pend = await api('GET', '/borrowings/pending', { token: tok.admin }); expect(pend, 200);
  assert.ok(pend.json.data.length >= 2);
  expect(await api('PUT', `/borrowings/${b1}/decision`, { token: tok.juan, body: { decision: 'approve' } }), 403); // student
  expect(await api('PUT', `/borrowings/${b1}/decision`, { token: tok.admin, body: { decision: 'approve', loan_days: 31 } }), 400);  // 1..30 only
  expect(await api('PUT', `/borrowings/${b1}/decision`, { token: tok.admin, body: { decision: 'approve', note: 'ok', loan_days: 10 } }), 200);
  expect(await api('PUT', `/borrowings/${b1}/decision`, { token: tok.admin, body: { decision: 'approve' } }), 409, 'already decided');
  // last copy gone -> procedure ROLLBACKs and API answers 409
  expect(await api('PUT', `/borrowings/${b2}/decision`, { token: tok.admin, body: { decision: 'approve' } }), 409, 'No copy available');
  expect(await api('PUT', `/borrowings/${b2}/decision`, { token: tok.admin, body: { decision: 'reject', note: 'No copy left' } }), 200);

  expect(await api('PUT', `/borrowings/${b1}/return-request`, { token: tok.juan }), 409);   // not issued yet -> illegal state
  expect(await api('PUT', `/borrowings/${b1}/issue`, { token: tok.admin }), 200);
  expect(await api('PUT', `/borrowings/${b1}/return-request`, { token: tok.maria }), 403, 'your own');
  // make it 3 days late directly in DB (test fixture), run overdue batch
  await pool.query('UPDATE library.borrow_transactions SET due_date = CURRENT_DATE - 3 WHERE borrow_id = $1', [b1]).catch(() => {});
  expect(await api('PUT', `/borrowings/${b1}/return-request`, { token: tok.juan }), 200);
  const cr = await api('PUT', `/borrowings/${b1}/confirm-return`, { token: tok.admin });
  expect(cr, 200); assert.equal(cr.json.data.fine_amount, '30.00');                                  // 3 days x PHP 10

  const mine = await api('GET', '/borrowings/mine', { token: tok.juan }); expect(mine, 200);
  assert.equal(mine.json.data[0].out_status, 'returned');
  const inv = await api('GET', '/reports/inventory', { token: tok.admin });
  assert.ok(inv.json.data.every((r) => r.consistent === true));                          // inventory reconciles
  expect(await api('POST', '/borrowings/mark-overdue', { token: tok.admin }), 200);
});

test('notifications created by triggers', async () => {
  const n = await api('GET', '/notifications', { token: tok.juan }); expect(n, 200);
  const types = n.json.data.map((x) => x.type);
  assert.ok(types.includes('borrow_approved') && types.includes('return_confirmed'), types.join());
  expect(await api('PUT', `/notifications/${n.json.data[0].notification_id}/read`, { token: tok.juan }), 200);
  expect(await api('PUT', `/notifications/${n.json.data[0].notification_id}/read`, { token: tok.maria }), 404); // not hers
});

test('e-library sessions + damage reports', async () => {
  const s = await api('POST', '/elibrary/sessions', { token: tok.juan, body: { unit_id: 1, purpose: 'Research' } }); expect(s, 201);
  expect(await api('POST', '/elibrary/sessions', { token: tok.maria, body: { unit_id: 1 } }), 409, 'not available');
  const units = await api('GET', '/elibrary/units', { token: tok.maria });
  assert.equal(units.json.data.find((u) => u.unit_id === 1).status, 'in_use');
  assert.ok(!('current_user_name' in units.json.data[0]));                                // hidden from students
  expect(await api('PUT', `/elibrary/sessions/${s.json.data.session_id}/end`, { token: tok.maria }), 403);
  expect(await api('PUT', `/elibrary/sessions/${s.json.data.session_id}/end`, { token: tok.juan }), 200);

  expect(await api('POST', '/damage-reports', { token: tok.juan, body: { damage_type: 'Cracked', description: 'Crack on monitor' } }), 400);
  const d = await api('POST', '/damage-reports', { token: tok.juan, body: { peripheral_id: 1, damage_type: 'Cracked screen', description: 'Crack on monitor', severity: 'moderate' } });
  expect(d, 201);
  expect(await api('PUT', `/damage-reports/${d.json.data.report_id}/resolve`, { token: tok.juan, body: { status: 'resolved', notes: 'x1' } }), 403);
  expect(await api('PUT', `/damage-reports/${d.json.data.report_id}/resolve`, { token: tok.admin, body: { status: 'resolved', notes: 'Sent for repair', new_condition: 'repair_needed' } }), 200);
  assert.equal((await api('GET', '/damage-reports', { token: tok.admin })).json.data.length, 0);
});

test('users admin soft delete + audit trail', async () => {
  const list = await api('GET', '/users', { token: tok.admin }); expect(list, 200);
  assert.ok(list.json.data.every((u) => !('password_hash' in u)));
  const ana = list.json.data.find((u) => u.full_name === 'Ana Reyes');
  assert.ok(ana, 'name sanitized by trigger');
  expect(await api('DELETE', `/users/${ana.user_id}`, { token: tok.admin }), 200);
  expect(await api('POST', '/auth/login', { body: { email: 'ana@ulitms.edu', password: 'Secret123!' } }), 401); // soft-deleted
  const a = await api('GET', '/audit-logs?table=borrow_transactions&limit=100', { token: tok.admin }); expect(a, 200);
  assert.ok(a.json.data.length > 5);
  assert.ok(a.json.data.some((r) => r.changed_by_user === 'Library Admin'));
  assert.ok(!JSON.stringify(a.json.data).includes('password_hash'));
  expect(await api('GET', '/audit-logs?limit=9999', { token: tok.admin }), 400);
  expect(await api('GET', '/nope', { token: tok.admin }), 404);
});

test('hardening: suspended account loses access at once; delete guards', async () => {
  // Pedro (user 4) logs in, then an admin suspends him: the SAME token must stop working.
  const login = await api('POST', '/auth/login', { body: { email: 'pedro@ulitms.edu', password: 'Student@123' } });
  expect(login, 200); const pedro = login.json.data.token;
  expect(await api('GET', '/auth/me', { token: pedro }), 200);
  expect(await api('PUT', '/users/4', { token: tok.admin, body: { status: 'suspended' } }), 200);
  expect(await api('GET', '/auth/me', { token: pedro }), 401, 'not active');
  expect(await api('POST', '/auth/login', { body: { email: 'pedro@ulitms.edu', password: 'Student@123' } }), 401);
  // admin cannot lock or delete themself
  expect(await api('PUT', '/users/1', { token: tok.admin, body: { status: 'inactive' } }), 409);
  expect(await api('DELETE', '/users/1', { token: tok.admin }), 409);
  // a user with an open request cannot be deleted
  expect(await api('PUT', '/users/4', { token: tok.admin, body: { status: 'active' } }), 200);
  const pedro2 = (await api('POST', '/auth/login', { body: { email: 'pedro@ulitms.edu', password: 'Student@123' } })).json.data.token;
  expect(await api('POST', '/borrowings', { token: pedro2, body: { book_id: 1 } }), 201);
  expect(await api('DELETE', '/users/4', { token: tok.admin }), 409, 'open requests');
  // unknown fields are rejected by the strict schemas (cannot sneak in role changes)
  expect(await api('PUT', '/users/4', { token: tok.admin, body: { role: 'admin' } }), 400);
});
