import { get, put } from '../api.js';
import { h, empty, fmtDate, fmtShort, peso, chip, confirmBox, run, toast, plural } from '../ui.js';

const STEPS = ['Requested', 'Approved', 'Borrowed', 'Return pending', 'Returned'];
const STEP_OF = { pending_approval: 0, approved: 1, borrowed: 2, overdue: 2, pending_return: 3, returned: 4 };

export async function render(main, ctx) {
  const list = h('div');
  main.append(h('div', { class: 'page-head' },
    h('div', null, h('h1', null, 'My loans'), h('p', null, 'Track each request from approval to return. Late returns cost ₱10 per day.'))), list);

  async function load() {
    const rows = await get('/borrowings/mine');
    list.replaceChildren();
    if (!rows.length) { list.append(empty('No loans yet', 'Books you request will show up here.', h('a', { class: 'btn btn-primary', href: '#/catalog' }, 'Browse the catalog'))); return; }
    const open = rows.filter((r) => !['returned', 'rejected', 'lost'].includes(r.out_status));
    const past = rows.filter((r) => ['returned', 'rejected', 'lost'].includes(r.out_status));
    if (open.length) list.append(h('h2', { style: 'margin-bottom:12px' }, `Current (${open.length})`), h('div', { class: 'loans' }, open.map(card)));
    if (past.length) list.append(h('h2', { style: 'margin:28px 0 12px' }, 'History'), h('div', { class: 'loans' }, past.map(card)));
  }

  function card(r) {
    const st = r.out_status, step = STEP_OF[st];
    const today = new Date().toISOString().slice(0, 10);
    const late = st === 'overdue' || (st === 'borrowed' && r.out_due_date && String(r.out_due_date).slice(0, 10) < today);
    const holding = ['approved', 'borrowed', 'overdue', 'pending_return'].includes(st);
    return h('article', { class: 'panel loan' },
      h('div', null,
        h('h3', null, r.out_title),
        h('div', { class: 'meta' }, `Requested ${fmtDate(r.out_requested_at)}`),
        step != null && h('div', { class: 'track', 'aria-label': `Progress: ${STEPS[step]}` },
          STEPS.map((s, i) => [i > 0 && h('em', { class: i <= step ? 'on' : '' }), h('span', { class: `${i <= step ? 'on' : ''}${i === step ? ' now' : ''}` }, s)])),
        r.out_decision_note && h('div', { class: 'note' }, h('b', null, 'Librarian’s note: '), r.out_decision_note)),
      h('div', { class: 'loan-side' },
        chip(late && st !== 'overdue' ? 'overdue' : st),
        holding && r.out_due_date && h('span', { class: `stamp${late ? ' late' : ''}` }, `DUE ${fmtShort(r.out_due_date).toUpperCase()}`),
        Number(r.out_fine_amount) > 0 && h('span', { class: 'muted' }, 'Fine ', h('b', { class: 'num', style: 'color:var(--stamp)' }, peso(r.out_fine_amount))),
        (st === 'borrowed' || st === 'overdue') && h('button', { class: 'btn btn-sm', onClick: async (e) => {
          const btn = e.currentTarget;
          if (!(await confirmBox({ title: 'Return this book?', message: `Tell the library you are returning “${r.out_title}”. A librarian confirms the return at the desk${late ? ' and calculates your late fine' : ''}.`, confirmLabel: 'Start return' }))) return;
          try { await run(btn, () => put(`/borrowings/${r.out_borrow_id}/return-request`)); toast('Return requested. Bring the book to the desk.'); load(); ctx.refreshBadges(); } catch { /* toast */ }
        } }, 'Return book'),
        st === 'approved' && h('span', { class: 'muted', style: 'max-width:20ch;text-align:right' }, 'Pick it up at the desk.')));
  }

  await load();
}
