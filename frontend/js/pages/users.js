import { get, put, del } from '../api.js';
import { h, icon, empty, modal, confirmBox, field, formData, run, toast, chip, peso, debounce } from '../ui.js';

export async function render(main, ctx) {
  let users = [], kw = '', st = '';
  const body = h('div');
  const search = h('input', { type: 'search', placeholder: 'Name or student number', 'aria-label': 'Search users' });
  const status = h('select', { 'aria-label': 'Filter by status', style: 'width:auto' }, h('option', { value: '' }, 'All statuses'),
    ['active', 'inactive', 'suspended'].map((s) => h('option', { value: s }, s[0].toUpperCase() + s.slice(1))));
  main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Users'), h('p', null, 'Accounts with their borrowing, fine and e-library activity.'))),
    h('div', { class: 'filters' }, h('div', { class: 'search' }, icon('search', 18), search), status), body);
  search.addEventListener('input', debounce(() => { kw = search.value.trim().toLowerCase(); draw(); }, 150));
  status.addEventListener('change', () => { st = status.value; draw(); });

  async function load() { users = await get('/users'); draw(); }
  function draw() {
    const rows = users.filter((u) => (!st || u.status === st) && (!kw || `${u.full_name} ${u.student_number}`.toLowerCase().includes(kw)));
    body.replaceChildren(!rows.length ? h('div', { class: 'panel' }, empty('No users match', 'Change the search or status filter.'))
      : h('div', { class: 'panel table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['User', 'Role', 'Status', 'Open loans*', 'Total loans*', 'Fines*', 'Sessions*', ''].map((t) => h('th', { class: t.endsWith('*') ? 'right' : '' }, t.replace('*', ''))))),
        h('tbody', null, rows.map((u) => h('tr', null,
          h('td', null, h('b', null, u.full_name), h('div', { class: 'muted', style: 'font-size:.85rem' }, u.student_number || '—')),
          h('td', null, u.role === 'admin' ? 'Administrator' : 'Student'),
          h('td', null, chip(u.status)),
          h('td', { class: 'right num' }, u.open_loans), h('td', { class: 'right num' }, u.total_borrowings),
          h('td', { class: 'right num' }, Number(u.total_fines) > 0 ? h('b', { style: 'color:var(--stamp)' }, peso(u.total_fines)) : '—'),
          h('td', { class: 'right num' }, u.total_sessions),
          h('td', null, h('div', { class: 'cell-actions' },
            h('button', { class: 'btn btn-sm', onClick: () => edit(u) }, icon('edit', 14), 'Edit'),
            u.role !== 'admin' && h('button', { class: 'btn btn-sm btn-ghost', style: 'color:var(--stamp)', onClick: () => remove(u) }, 'Delete')))))))));
  }

  function edit(u) {
    const self = u.user_id === ctx.user.user_id;
    const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const form = h('form', { id: 'uf', novalidate: true }, err,
      h('p', null, h('b', null, u.full_name), ' · ', u.student_number || u.role),
      field('Account status', h('select', { name: 'status', disabled: self }, ['active', 'inactive', 'suspended'].map((s) => h('option', { value: s, selected: u.status === s }, s[0].toUpperCase() + s.slice(1)))),
        self ? 'You cannot change your own status.' : 'Suspended and inactive users can’t sign in.'),
      h('p', { class: 'muted', style: 'margin:18px 0 10px' }, 'Change details (leave blank to keep as is)'),
      h('div', { class: 'grid-2' }, field('First name', h('input', { type: 'text', name: 'first_name', maxlength: 50 })), field('Last name', h('input', { type: 'text', name: 'last_name', maxlength: 50 }))),
      h('div', { class: 'grid-2' }, field('Course', h('input', { type: 'text', name: 'course', maxlength: 100 })), field('Year level', h('select', { name: 'year_level' }, h('option', { value: '' }, 'Keep'), [1, 2, 3, 4, 5, 6].map((n) => h('option', { value: n }, n))))),
      field('Contact number', h('input', { type: 'text', name: 'contact_number', maxlength: 20 })));
    modal({
      title: 'Edit user', body: form,
      actions: (close) => [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
        h('button', { class: 'btn btn-primary', type: 'submit', form: 'uf', onClick: async (e) => {
          e.preventDefault();
          const d = formData(form), body = {};
          for (const [k, v] of Object.entries(d)) if (v.trim() !== '') body[k] = k === 'year_level' ? Number(v) : v.trim();
          if (self || body.status === u.status) delete body.status;
          if (!Object.keys(body).length) { err.textContent = 'Change at least one field.'; err.hidden = false; return; }
          try { await run(e.currentTarget, () => put(`/users/${u.user_id}`, body)); toast('User saved'); close(); load(); } catch (x) { err.textContent = x.message; err.hidden = false; }
        } }, 'Save changes'),
      ],
    });
  }

  async function remove(u) {
    if (!(await confirmBox({ title: 'Delete user', message: `Delete ${u.full_name}? They will no longer be able to sign in. Users with open loans can’t be deleted.`, confirmLabel: 'Delete user', danger: true }))) return;
    try { await del(`/users/${u.user_id}`); toast('User deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  }
  await load();
}
