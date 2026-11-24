import { get, put } from '../api.js';
import { h, empty, run, toast, ago, fmtDateTime } from '../ui.js';

export async function render(main, ctx) {
  const body = h('div', { class: 'panel' });
  const markAll = h('button', { class: 'btn', onClick: async (e) => {
    try { await run(e.currentTarget, async () => { for (const n of items.filter((x) => !x.is_read)) await put(`/notifications/${n.notification_id}/read`); }); toast('All marked as read'); load(); } catch { /* toast */ }
  } }, 'Mark all as read');
  main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Notifications'), h('p', null, 'Updates about your requests, loans and reports.')), markAll), body);
  let items = [];
  async function read(n) {
    if (n.is_read) return;
    try { await put(`/notifications/${n.notification_id}/read`); n.is_read = true; draw(); ctx.refreshBadges(); } catch (e) { toast(e.message, 'error'); }
  }
  function draw() {
    markAll.hidden = !items.some((n) => !n.is_read);
    body.replaceChildren(!items.length ? empty('You’re all caught up', 'New notifications will appear here.') :
      h('div', { class: 'notes' }, items.map((n) => h('div', { class: `note-row${n.is_read ? '' : ' unread'}` },
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
        h('div', null, h('strong', null, n.title, !n.is_read && h('span', { class: 'sr-only' }, ' (unread)')), h('p', null, n.message)),
        h('div', { style: 'text-align:right' }, h('time', { datetime: n.created_at, title: fmtDateTime(n.created_at) }, ago(n.created_at)),
          !n.is_read && h('div', null, h('button', { class: 'btn btn-sm btn-ghost', onClick: () => read(n) }, 'Mark read')))))));
  }
  async function load() { items = await get('/notifications'); draw(); ctx.refreshBadges(); }
  await load();
}
