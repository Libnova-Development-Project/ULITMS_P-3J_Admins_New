import { get } from '../api.js';
import { h, empty, errorState, fmtDateTime, field } from '../ui.js';

const TABLES = ['users', 'books', 'borrow_transactions', 'elibrary_sessions', 'damage_reports', 'notifications'];
const TABLE_LABEL = { users: 'Users', books: 'Books', borrow_transactions: 'Borrowings', elibrary_sessions: 'E-Library sessions', damage_reports: 'Damage reports', notifications: 'Notifications' };
const LIMIT = 50;

function diff(r) {
  const o = r.old_data || {}, n = r.new_data || {};
  const keys = r.operation === 'UPDATE' ? [...new Set([...Object.keys(o), ...Object.keys(n)])].filter((k) => JSON.stringify(o[k]) !== JSON.stringify(n[k]) && k !== 'updated_at')
    : Object.keys(r.operation === 'DELETE' ? o : n).filter((k) => k !== 'password_hash');
  const fmt = (v) => (v == null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return h('div', { class: 'diff' }, keys.length ? keys.map((k) => h('div', null,
    h('span', { class: 'k' }, k + ': '),
    r.operation === 'UPDATE' ? [h('span', { class: 'old' }, fmt(o[k])), ' → ', h('span', { class: 'new' }, fmt(n[k]))] : fmt((r.operation === 'DELETE' ? o : n)[k]))) : 'No field changes recorded.');
}

export async function render(main) {
  const q = { table: '', operation: '', record_id: '', offset: 0 };
  const body = h('div');
  const sel = (name, label, opts) => field(label, h('select', { name, onChange: (e) => { q[name] = e.target.value; q.offset = 0; load(); } }, h('option', { value: '' }, 'All'), opts.map(([v, l]) => h('option', { value: v }, l))));
  const rec = h('input', { type: 'number', min: 1, placeholder: 'Any', onChange: (e) => { q.record_id = e.target.value; q.offset = 0; load(); } });
  main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Audit log'), h('p', null, 'Every insert, update and delete recorded by the database, newest first.'))),
    h('div', { class: 'row', style: 'align-items:flex-end;margin-bottom:6px' },
      h('div', { style: 'min-width:200px' }, sel('table', 'Table', TABLES.map((t) => [t, TABLE_LABEL[t]]))),
      h('div', { style: 'min-width:150px' }, sel('operation', 'Action', [['INSERT', 'Insert'], ['UPDATE', 'Update'], ['DELETE', 'Delete']])),
      h('div', { style: 'width:130px' }, field('Record ID', rec))), body);

  async function load() {
    let rows;
    try { rows = await get('/audit-logs', { table: q.table, operation: q.operation, record_id: q.record_id, limit: LIMIT, offset: q.offset }); }
    catch (e) { body.replaceChildren(errorState(e, load)); return; }
    if (!rows.length && q.offset === 0) { body.replaceChildren(h('div', { class: 'panel' }, empty('No matching entries', 'Change the filters to see more.'))); return; }
    const tbody = h('tbody');
    rows.forEach((r) => {
      const detail = h('tr', { hidden: true }, h('td', { colspan: 5, style: 'background:#F1F4F1' }, diff(r)));
      const tr = h('tr', { class: 'expandable', tabindex: 0, 'aria-expanded': 'false' },
        h('td', { class: 'num' }, fmtDateTime(r.changed_at)),
        h('td', null, TABLE_LABEL[r.table_name] || r.table_name, h('span', { class: 'muted' }, ` #${r.record_id}`)),
        h('td', null, h('span', { class: `op ${r.operation}` }, r.operation)),
        h('td', null, r.changed_by_user),
        h('td', { class: 'muted' }, 'Details'));
      const toggle = () => { detail.hidden = !detail.hidden; tr.setAttribute('aria-expanded', String(!detail.hidden)); };
      tr.addEventListener('click', toggle);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      tbody.append(tr, detail);
    });
    body.replaceChildren(h('div', { class: 'panel' },
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['When', 'Record', 'Action', 'Changed by', ''].map((t) => h('th', null, t)))), tbody)),
      h('div', { class: 'pager' },
        h('button', { class: 'btn btn-sm', disabled: q.offset === 0, onClick: () => { q.offset = Math.max(0, q.offset - LIMIT); load(); } }, 'Newer'),
        h('span', { class: 'muted' }, `Showing ${q.offset + 1}–${q.offset + rows.length}`),
        h('button', { class: 'btn btn-sm', disabled: rows.length < LIMIT, onClick: () => { q.offset += LIMIT; load(); } }, 'Older'))));
  }
  await load();
}
