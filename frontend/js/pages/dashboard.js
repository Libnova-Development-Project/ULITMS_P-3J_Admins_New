import { get, put, post } from '../api.js';
import { h, icon, plural, chip, empty, toast, run, confirmBox, ago, peso, fmtShort, statusLabel } from '../ui.js';
import { reportModal } from './report.js';

const ok = (r) => (r.status === 'fulfilled' ? r.value : null);
const LIMIT = 5;

function activityText(r) {
  const id = `#${r.record_id}`, n = r.new_data || {};
  switch (r.table_name) {
    case 'borrow_transactions':
      return r.operation === 'INSERT' ? `New borrow request ${id}` : `Borrowing ${id} is now ${statusLabel(n.status).toLowerCase()}`;
    case 'books': return r.operation === 'INSERT' ? `Book ${id} added${n.title ? `: ${n.title}` : ''}` : r.operation === 'DELETE' ? `Book ${id} removed` : `Book ${id} updated${n.title ? `: ${n.title}` : ''}`;
    case 'users': return r.operation === 'INSERT' ? `New account ${id}` : `Account ${id} updated`;
    case 'elibrary_sessions': return r.operation === 'INSERT' ? `E-Library session started (${id})` : n.time_out ? `E-Library session ended (${id})` : `E-Library session ${id} updated`;
    case 'damage_reports': return r.operation === 'INSERT' ? `Damage report ${id} filed` : `Damage report ${id} is now ${statusLabel(n.status).toLowerCase()}`;
    default: return `${r.table_name} ${id} ${r.operation.toLowerCase()}d`;
  }
}
const greeting = () => {
  const hr = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' })) % 24;
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
};

export async function render(main, ctx) {
  const body = h('div');
  const stamp = h('span', { class: 'muted', style: 'font-size:.85rem' });
  let updated = Date.now();

  main.append(
    h('div', { class: 'page-head' },
      h('div', null, h('h1', null, `${greeting()}, ${ctx.user.first_name || 'there'}`), h('p', { id: 'dash-sub' }, '')),
      h('div', { class: 'row' },
        stamp,
        h('button', { class: 'btn', onClick: addBook }, icon('plus', 16), 'Add book'),
        h('button', { class: 'btn', onClick: newReport }, icon('wrench', 16), 'New damage report'),
        h('button', { class: 'btn', onClick: overdueCheck, title: 'Flags loans past their due date as overdue' }, icon('clock', 16), 'Run overdue check'))),
    body);

  async function addBook() { (await import('./catalog.js')).bookForm(null, load); }
  async function newReport() { try { reportModal({ units: await get('/elibrary/units'), onDone: load }); } catch (e) { toast(e.message, 'error'); } }
  async function overdueCheck(e) {
    try { const d = await run(e.currentTarget, () => post('/borrowings/mark-overdue')); toast(d.updated ? `${plural(Number(d.updated), 'loan')} marked overdue` : 'No new overdue loans'); load(); } catch { /* toast */ }
  }

  async function refreshAll() { await load(); ctx.refreshBadges(); }
  async function act(e, fn, msg) { try { await run(e.currentTarget, fn); toast(msg); refreshAll(); } catch { /* toast */ } }

  async function load() {
    const [st, pend, act_, log, units, inv] = await Promise.allSettled([
      get('/dashboard'), get('/borrowings/pending'), get('/borrowings/active'), get('/audit-logs', { limit: 30 }), get('/elibrary/units'), get('/reports/inventory')]);
    if (st.status === 'rejected') { throw st.reason; }
    const s = Object.fromEntries(Object.entries(st.value).map(([k, v]) => [k, Number(v)]));
    const pending = ok(pend) || [], active = ok(act_) || [];
    const handover = active.filter((r) => r.status === 'approved');
    const returns = active.filter((r) => r.status === 'pending_return');
    const late = active.filter((r) => r.status === 'overdue' || Number(r.days_overdue) > 0);
    const need = s.pending_requests + s.pending_returns + s.overdue_borrowings + s.open_damage_reports + handover.length;

    document.getElementById('dash-sub').textContent = `${new Date().toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Manila' })}. ${need ? `${plural(need, 'item')} need your attention.` : 'Nothing is waiting.'}`;
    updated = Date.now(); tick();

    const groups = [
      { n: s.pending_requests, title: 'Borrow requests', sub: 'Approve or decline', href: '#/approvals', rows: pending.slice(0, LIMIT).map((r) => item(r.out_student_name, r.out_title, ago(r.out_requested_at), [
        h('button', { class: 'btn btn-sm', onClick: (e) => decline(e, r) }, 'Decline'),
        h('button', { class: 'btn btn-sm btn-primary', title: 'Approves with a 7-day loan. Use the desk to choose another period.', onClick: (e) => act(e, () => put(`/borrowings/${r.out_borrow_id}/decision`, { decision: 'approve', loan_days: 7 }), 'Request approved for 7 days') }, 'Approve · 7 days')])) },
      { n: handover.length, title: 'Ready for handover', sub: 'Approved, waiting for pickup', href: '#/approvals', rows: handover.slice(0, LIMIT).map((r) => item(r.student_name, r.title, `due ${fmtShort(r.due_date)}`, [
        h('button', { class: 'btn btn-sm btn-primary', onClick: (e) => act(e, () => put(`/borrowings/${r.borrow_id}/issue`), 'Book handed over') }, 'Hand over')])) },
      { n: s.pending_returns, title: 'Returns to confirm', sub: 'Students handed the book back', href: '#/approvals', rows: returns.slice(0, LIMIT).map((r) => item(r.student_name, r.title, Number(r.projected_fine) > 0 ? `fine ${peso(r.projected_fine)}` : 'no fine', [
        h('button', { class: 'btn btn-sm btn-primary', onClick: (e) => confirmReturn(e, r) }, 'Confirm return')])) },
      { n: s.overdue_borrowings, title: 'Overdue loans', sub: 'Fines grow ₱10 each day', href: '#/approvals', hot: true, rows: late.slice(0, LIMIT).map((r) => item(r.student_name, r.title, `${r.days_overdue} d late · ${peso(r.projected_fine)}`, [])) },
      { n: s.open_damage_reports, title: 'Damage reports', sub: 'Open or under review', href: '#/damage', rows: [] },
    ];
    const live = groups.filter((g) => g.n > 0), quiet = groups.filter((g) => g.n === 0);

    const attention = h('section', { class: 'panel attn', 'aria-label': 'Needs attention' },
      h('h2', { class: 'ph' }, 'Needs your attention'),
      live.length ? live.map((g) => h('div', { class: 'grp' },
        h('a', { class: 'grp-head', href: g.href }, h('span', { class: `n num${g.hot ? ' hot' : ''}` }, g.n), h('span', null, h('strong', null, g.title), h('small', null, g.sub)), h('span', { class: 'go', 'aria-hidden': 'true' }, '›')),
        g.rows.length > 0 && h('div', { class: 'items' }, g.rows, g.n > g.rows.length && h('a', { class: 'more', href: g.href }, `${g.n - g.rows.length} more in ${g.href === '#/damage' ? 'damage reports' : 'the borrowing desk'}`))))
        : h('div', { class: 'clear' }, icon('check', 26), h('div', null, h('strong', null, 'All clear'), h('p', { class: 'muted' }, 'No requests, returns, overdue loans or damage reports are waiting.'))),
      live.length > 0 && quiet.length > 0 && h('p', { class: 'quiet' }, `Nothing waiting for: ${quiet.map((g) => g.title.toLowerCase()).join(', ')}.`));

    const feed = (ok(log) || []).filter((r) => r.table_name !== 'notifications').slice(0, 8);
    const activity = h('section', { class: 'panel' },
      h('h2', { class: 'ph' }, 'Recent activity'),
      feed.length ? h('ul', { class: 'feed' }, feed.map((r) => h('li', null,
        h('span', { class: `op ${r.operation}` }, r.operation === 'INSERT' ? 'NEW' : r.operation === 'DELETE' ? 'DEL' : 'EDIT'),
        h('span', null, activityText(r), h('small', { class: 'muted' }, ` by ${r.changed_by_user}`)),
        h('time', { class: 'muted', datetime: r.changed_at }, ago(r.changed_at)))))
        : h('div', { style: 'padding:0 20px 18px' }, h('p', { class: 'muted' }, ok(log) ? 'No activity recorded yet.' : 'Activity isn’t available right now.')),
      h('div', { class: 'stat-line' }, h('a', { href: '#/audit' }, 'Open the audit log'), h('span')));

    // Collection
    const rows = ok(inv);
    const total = rows ? rows.reduce((a, r) => a + Number(r.total_copies), 0) : null;
    const shelf = rows ? rows.reduce((a, r) => a + Number(r.available_copies), 0) : s.available_copies;
    const collection = h('section', { class: 'panel' },
      h('h2', { class: 'ph' }, 'Collection'),
      h('div', { class: 'stock' },
        h('div', { class: 'row', style: 'align-items:baseline;gap:10px' }, h('b', { class: 'num big' }, shelf.toLocaleString()), h('span', { class: 'muted' }, total != null ? `of ${total.toLocaleString()} copies on the shelf` : 'copies on the shelf')),
        total > 0 && h('div', { class: 'bar', role: 'img', 'aria-label': `${shelf} of ${total} copies on the shelf` }, h('i', { style: `width:${(shelf / total) * 100}%` })),
        h('div', { class: 'figs muted' }, h('span', null, `${plural(s.total_books, 'title')}`), h('span', null, `${total != null ? total - shelf : s.active_borrowings} out on loan`))));

    // Stock watch
    const none = rows ? rows.filter((r) => Number(r.available_copies) < 1) : [];
    const bad = rows ? rows.filter((r) => !r.consistent) : [];
    const watch = h('section', { class: 'panel' },
      h('h2', { class: 'ph' }, 'Stock watch'),
      !rows ? h('p', { class: 'muted', style: 'padding:0 20px 18px' }, 'Inventory isn’t available right now.')
        : (none.length || bad.length) ? h('ul', { class: 'feed' },
          none.slice(0, 4).map((r) => h('li', null, h('span', { class: 'chip chip-bad' }, 'No copies'), h('span', { class: 'book-title', style: 'font-size:.95rem' }, r.title))),
          bad.slice(0, 3).map((r) => h('li', null, h('span', { class: 'chip chip-wait' }, 'Mismatch'), h('span', { class: 'book-title', style: 'font-size:.95rem' }, r.title))),
          none.length > 4 && h('li', { class: 'muted' }, `${none.length - 4} more titles with no copies`))
          : h('div', { class: 'stock', style: 'padding-top:0' }, h('p', { class: 'muted', style: 'margin:0' }, 'Every title has a copy on the shelf and all counts match.')),
      h('div', { class: 'stat-line' }, h('a', { href: '#/inventory' }, 'Open inventory check'), h('span')));

    // Computers
    const us = ok(units) || [];
    const comps = h('section', { class: 'panel' },
      h('h2', { class: 'ph' }, 'E-Library computers'),
      us.length ? h('div', { class: 'minis' }, us.map((u) => h('a', { href: '#/library', class: `mini ${u.status}`, title: u.status === 'in_use' ? `${u.current_user_name || 'In use'}` : statusLabel(u.status) },
        h('b', null, u.unit_code),
        h('span', null, u.status === 'in_use' ? [u.current_user_name || 'In use', h('small', null, ` · ${ago(u.time_in).replace(' ago', '')}`)] : statusLabel(u.status)))))
        : h('div', { class: 'stock' }, h('p', { class: 'muted' }, `${s.units_available} free · ${s.units_in_use} in use`)),
      h('div', { class: 'stat-line' }, h('span', null, h('b', { class: 'num' }, s.units_available), ' free · ', h('b', { class: 'num' }, s.units_in_use), ' in use'), h('a', { href: '#/library' }, 'Floor view')));

    body.replaceChildren(h('div', { class: 'desk-grid' }, h('div', { style: 'display:grid;gap:20px' }, attention, activity), h('div', { style: 'display:grid;gap:20px' }, collection, watch, comps)));
  }

  function item(who, what, meta, actions) {
    return h('div', { class: 'item' },
      h('div', { class: 'who' }, h('b', null, who), h('span', { class: 'book-title' }, what), h('small', { class: 'muted' }, meta)),
      h('div', { class: 'cell-actions' }, actions));
  }
  async function decline(e, r) {
    if (!(await confirmBox({ title: 'Decline request', message: `Decline ${r.out_student_name}’s request for “${r.out_title}”? Use the borrowing desk if you want to add a reason.`, confirmLabel: 'Decline', danger: true }))) return;
    act(e, () => put(`/borrowings/${r.out_borrow_id}/decision`, { decision: 'reject' }), 'Request declined');
  }
  async function confirmReturn(e, r) {
    if (!(await confirmBox({ title: 'Confirm return', message: `Confirm you received “${r.title}” from ${r.student_name}?${Number(r.projected_fine) > 0 ? ` A fine of ${peso(r.projected_fine)} will be recorded.` : ''}`, confirmLabel: 'Confirm return' }))) return;
    try { const d = await put(`/borrowings/${r.borrow_id}/confirm-return`); toast(Number(d.fine_amount) > 0 ? `Return confirmed. Fine: ${peso(d.fine_amount)}` : 'Return confirmed. No fine.'); refreshAll(); } catch (x) { toast(x.message, 'error'); }
  }

  const tick = () => { stamp.textContent = `Updated ${ago(updated)}`; };
  await load();
  const reload = setInterval(() => load().catch(() => {}), 60000);
  const clock = setInterval(tick, 20000);
  return () => { clearInterval(reload); clearInterval(clock); };
}
