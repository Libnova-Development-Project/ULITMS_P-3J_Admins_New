import { get, put, post } from '../api.js';
import { h, empty, modal, confirmBox, field, formData, run, toast, chip, fmtDate, fmtShort, peso, ago } from '../ui.js';

export async function render(main, ctx) {
  let tab = 'requests';
  const body = h('div');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  let data = { pending: [], active: [] };

  main.append(
    h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Borrowing desk'), h('p', null, 'Decide requests, hand books over and confirm returns.')),
      h('button', { class: 'btn', onClick: markOverdue, title: 'Flags loans that passed their due date as overdue' }, 'Run overdue check')),
    tabs, body);

  async function load() {
    const [pending, active] = await Promise.all([get('/borrowings/pending'), get('/borrowings/active')]);
    data = { pending, active }; draw();
  }
  const by = (st) => data.active.filter((r) => (Array.isArray(st) ? st : [st]).includes(r.status));

  function draw() {
    const defs = [
      ['requests', 'Requests', data.pending.length],
      ['handover', 'Ready for handover', by('approved').length],
      ['loan', 'On loan', by(['borrowed', 'overdue']).length],
      ['returns', 'Returns to confirm', by('pending_return').length],
    ];
    tabs.replaceChildren(...defs.map(([id, label, n]) => h('button', { role: 'tab', 'aria-selected': String(tab === id), onClick: () => { tab = id; draw(); } },
      label, n > 0 && h('span', { class: 'badge' }, n))));
    body.replaceChildren(panelFor());
  }

  function table(cols, rows, emptyMsg) {
    if (!rows.length) return h('div', { class: 'panel' }, empty(...emptyMsg));
    return h('div', { class: 'panel table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, cols.map((c) => h('th', { class: c.endsWith('*') ? 'right' : '' }, c.replace('*', ''))))),
      h('tbody', null, rows)));
  }
  const who = (name, no) => h('td', null, h('b', null, name), h('div', { class: 'muted', style: 'font-size:.85rem' }, no));

  function panelFor() {
    if (tab === 'requests') return table(['Student', 'Book', 'Requested', 'Copies left', ''], data.pending.map((r) => h('tr', null,
      who(r.out_student_name, r.out_student_number),
      h('td', { class: 'book-title' }, r.out_title),
      h('td', null, ago(r.out_requested_at)),
      h('td', { class: 'num' }, r.out_available_copies > 0 ? r.out_available_copies : h('span', { style: 'color:var(--stamp);font-weight:600' }, 'None')),
      h('td', null, h('div', { class: 'cell-actions' },
        h('button', { class: 'btn btn-sm', onClick: () => decide(r, 'reject') }, 'Decline'),
        h('button', { class: 'btn btn-sm btn-primary', onClick: () => decide(r, 'approve') }, 'Approve'))))),
      ['No requests waiting', 'New borrow requests will appear here.']);
    if (tab === 'handover') return table(['Student', 'Book', 'Due date', ''], by('approved').map((r) => h('tr', null,
      who(r.student_name, r.student_number), h('td', { class: 'book-title' }, r.title), h('td', null, fmtDate(r.due_date)),
      h('td', null, h('div', { class: 'cell-actions' }, h('button', { class: 'btn btn-sm btn-primary', onClick: (e) => act(e, `/borrowings/${r.borrow_id}/issue`, 'Book handed over') }, 'Hand over'))))),
      ['Nothing to hand over', 'Approved requests wait here until the student picks up the book.']);
    if (tab === 'loan') return table(['Student', 'Book', 'Due', 'Status', 'Fine so far*'], by(['borrowed', 'overdue']).map((r) => h('tr', null,
      who(r.student_name, r.student_number), h('td', { class: 'book-title' }, r.title), h('td', null, fmtShort(r.due_date)),
      h('td', null, chip(Number(r.days_overdue) > 0 ? 'overdue' : r.status), Number(r.days_overdue) > 0 && h('span', { class: 'muted', style: 'margin-left:8px;font-size:.85rem' }, `${r.days_overdue} d late`)),
      h('td', { class: 'right num' }, Number(r.projected_fine) > 0 ? h('b', { style: 'color:var(--stamp)' }, peso(r.projected_fine)) : '—'))),
      ['No books on loan', 'Issued books appear here with live overdue fines.']);
    return table(['Student', 'Book', 'Due', 'Fine if returned today*', ''], by('pending_return').map((r) => h('tr', null,
      who(r.student_name, r.student_number), h('td', { class: 'book-title' }, r.title), h('td', null, fmtShort(r.due_date)),
      h('td', { class: 'right num' }, Number(r.projected_fine) > 0 ? h('b', { style: 'color:var(--stamp)' }, peso(r.projected_fine)) : '—'),
      h('td', null, h('div', { class: 'cell-actions' }, h('button', { class: 'btn btn-sm btn-primary', onClick: (e) => confirmReturn(r, e.currentTarget) }, 'Confirm return'))))),
      ['No returns waiting', 'When a student starts a return it shows up here.']);
  }

  async function refresh() { await load(); ctx.refreshBadges(); }
  async function act(e, path, msg) { try { await run(e.currentTarget, () => put(path)); toast(msg); refresh(); } catch { /* toast */ } }

  async function confirmReturn(r, btn) {
    if (!(await confirmBox({ title: 'Confirm return', message: `Confirm you received “${r.title}” from ${r.student_name}?${Number(r.projected_fine) > 0 ? ` A fine of ${peso(r.projected_fine)} will be recorded.` : ''}`, confirmLabel: 'Confirm return' }))) return;
    try { const d = await run(btn, () => put(`/borrowings/${r.borrow_id}/confirm-return`)); toast(Number(d.fine_amount) > 0 ? `Return confirmed. Fine: ${peso(d.fine_amount)}` : 'Return confirmed. No fine.'); refresh(); } catch { /* toast */ }
  }

  function decide(r, decision) {
    const approve = decision === 'approve';
    const err = h('p', { class: 'form-error', hidden: true });
    const form = h('form', { id: 'dec', novalidate: true }, err,
      h('p', null, h('b', null, r.out_student_name), ' · ', h('span', { class: 'book-title' }, r.out_title)),
      approve && field('Loan period', h('input', { type: 'number', name: 'loan_days', min: 1, max: 30, value: 7, required: true }), 'Days, from 1 to 30.'),
      field(approve ? 'Note to student (optional)' : 'Reason for declining', h('textarea', { name: 'note', maxlength: 500, placeholder: approve ? 'Pick up before Friday.' : 'Why is this being declined?' })));
    modal({
      title: approve ? 'Approve request' : 'Decline request', body: form,
      actions: (close) => [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
        h('button', { class: `btn ${approve ? 'btn-primary' : 'btn-danger'}`, type: 'submit', form: 'dec', onClick: async (e) => {
          e.preventDefault();
          const d = formData(form); const payload = { decision };
          if (d.note?.trim()) payload.note = d.note.trim();
          if (approve) { const n = Number(d.loan_days); if (!(n >= 1 && n <= 30)) { err.textContent = 'Loan period must be 1 to 30 days.'; err.hidden = false; return; } payload.loan_days = n; }
          try { await run(e.currentTarget, () => put(`/borrowings/${r.out_borrow_id}/decision`, payload)); toast(approve ? 'Request approved' : 'Request declined'); close(); refresh(); } catch { /* toast */ }
        } }, approve ? 'Approve' : 'Decline'),
      ],
    });
  }

  async function markOverdue(e) {
    try { const d = await run(e.currentTarget, () => post('/borrowings/mark-overdue')); toast(d.updated ? `${d.updated} loan${d.updated === 1 ? '' : 's'} marked overdue` : 'No new overdue loans'); refresh(); } catch { /* toast */ }
  }

  await load();
}
