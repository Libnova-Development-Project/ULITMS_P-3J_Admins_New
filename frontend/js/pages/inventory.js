import { get } from '../api.js';
import { h, empty, plural } from '../ui.js';

export async function render(main) {
  const rows = await get('/reports/inventory');
  const bad = rows.filter((r) => !r.consistent);
  let onlyBad = false;
  const body = h('div');
  const toggle = h('label', { class: 'row', style: 'gap:8px;cursor:pointer' }, h('input', { type: 'checkbox', style: 'width:auto;min-height:0', onChange: (e) => { onlyBad = e.target.checked; draw(); } }), 'Show mismatches only');
  main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Inventory check'),
    h('p', null, 'Compares copies on the shelf with copies held by approved, borrowed and overdue loans.'))),
    h('div', { class: 'panel panel-pad', style: 'margin-bottom:20px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center' },
      bad.length ? h('div', null, h('b', { style: 'color:var(--stamp);font-size:1.1rem' }, `${plural(bad.length, 'title')} don’t add up`), h('div', { class: 'muted' }, 'Shelf count and loan records disagree. Check the audit log for these books.'))
        : h('div', null, h('b', { style: 'color:var(--ok);font-size:1.1rem' }, 'Every title adds up'), h('div', { class: 'muted' }, `${plural(rows.length, 'title')} checked. Shelf counts match loan records.`)),
      toggle), body);
  function draw() {
    const list = onlyBad ? bad : rows;
    body.replaceChildren(!list.length ? h('div', { class: 'panel' }, empty('No mismatches', 'All counts agree.'))
      : h('div', { class: 'panel table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Book', 'Total*', 'On shelf*', 'Held by loans*', 'Result'].map((t) => h('th', { class: t.endsWith('*') ? 'right' : '' }, t.replace('*', ''))))),
        h('tbody', null, list.map((r) => h('tr', null, h('td', { class: 'book-title' }, r.title),
          h('td', { class: 'right num' }, r.total_copies), h('td', { class: 'right num' }, r.available_copies), h('td', { class: 'right num' }, r.copies_allocated),
          h('td', null, r.consistent ? h('span', { class: 'chip chip-go' }, 'Matches') : h('span', { class: 'chip chip-bad' }, 'Mismatch'))))))));
  }
  draw();
}
