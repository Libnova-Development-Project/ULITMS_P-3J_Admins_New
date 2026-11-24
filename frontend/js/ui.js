// Small DOM helpers: element builder, icons, toast, modal, formatting.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = (el) => { el.replaceChildren(); return el; };

// ---------- icons (24px grid, 1.6 stroke) ----------
const ICONS = {
  catalog: 'M5 4h3v16H5zM10 4h3v16h-3zM15.2 5.2l2.8-.9 3.4 15.2-2.8.9z',
  loans: 'M4 7h13l-3-3M20 17H7l3 3M4 7v0M20 17v0',
  monitor: 'M3 5h18v11H3zM9 20h6M12 16v4',
  wrench: 'M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.5-8.5z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4',
  grid: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  check: 'M4 12l5 5L20 6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  scale: 'M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  scroll: 'M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3V7a3 3 0 0 0-2-3zM10 9h5M10 13h5',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
  close: 'M6 6l12 12M18 6L6 18',
  out: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  edit: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
};
export function icon(name, size = 18) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONS[name] || ICONS.catalog); s.append(p);
  return s;
}

// ---------- formatting ----------
const TZ = 'Asia/Manila';
export const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: v.length === 10 ? 'UTC' : TZ }) : '—';
export const fmtShort = (v) => v ? new Date(v).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', timeZone: v.length === 10 ? 'UTC' : TZ }) : '—';
export const fmtDateTime = (v) => v ? new Date(v).toLocaleString('en-PH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '—';
export const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function ago(v) {
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(v);
}
export const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

// ---------- status chips ----------
const STATUS = {
  pending_approval: ['Waiting for approval', 'wait'], approved: ['Ready for pickup', 'go'], rejected: ['Declined', 'bad'],
  borrowed: ['Borrowed', 'live'], pending_return: ['Return pending', 'wait'], returned: ['Returned', 'done'],
  overdue: ['Overdue', 'bad'], lost: ['Lost', 'bad'],
  available: ['Available', 'go'], in_use: ['In use', 'live'], maintenance: ['Maintenance', 'wait'], offline: ['Offline', 'bad'],
  open: ['Open', 'bad'], under_review: ['Under review', 'wait'], resolved: ['Resolved', 'go'], closed: ['Closed', 'done'],
  active: ['Active', 'go'], inactive: ['Inactive', 'done'], suspended: ['Suspended', 'bad'],
  minor: ['Minor', 'done'], moderate: ['Moderate', 'wait'], severe: ['Severe', 'bad'],
};
export const statusLabel = (s) => (STATUS[s] || [String(s || '').replace(/_/g, ' ')])[0];
export function chip(status) {
  const [label, tone] = STATUS[status] || [String(status).replace(/_/g, ' '), 'done'];
  return h('span', { class: `chip chip-${tone}` }, label);
}

// ---------- states ----------
export const loading = (text = 'Loading') => h('div', { class: 'state', role: 'status' }, h('span', { class: 'spinner' }), text);
export function empty(title, hint, action) {
  return h('div', { class: 'state empty' }, h('strong', null, title), hint && h('p', null, hint), action);
}
export function errorState(err, retry) {
  return h('div', { class: 'state error', role: 'alert' },
    h('strong', null, 'Something went wrong'), h('p', null, err.message || String(err)),
    retry && h('button', { class: 'btn', onClick: retry }, 'Try again'));
}

// ---------- toast ----------
export function toast(message, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  box.append(t);
  setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 220); }, kind === 'error' ? 6000 : 3200);
}

// ---------- modal (native <dialog>) ----------
export function modal({ title, body, actions, wide = false, side = false, onClose }) {
  const dlg = h('dialog', { class: `modal${wide ? ' wide' : ''}${side ? ' side' : ''}`, 'aria-labelledby': 'modal-title' });
  const close = () => { dlg.close(); };
  dlg.append(
    h('header', { class: 'modal-head' }, h('h2', { id: 'modal-title' }, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Close', onClick: close, type: 'button' }, icon('close'))),
    h('div', { class: 'modal-body' }, body),
    actions ? h('footer', { class: 'modal-foot' }, typeof actions === 'function' ? actions(close) : actions) : null,
  );
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { dlg, close };
}

export function confirmBox({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    modal({
      title, body: h('p', null, message),
      actions: (close) => [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', onClick: () => { result = true; close(); } }, confirmLabel),
      ],
      onClose: () => resolve(result),
    });
  });
}

// ---------- form helpers ----------
export function field(label, input, hint) {
  const id = input.id || (input.id = 'f' + Math.random().toString(36).slice(2, 8));
  return h('div', { class: 'field' }, h('label', { for: id }, label), input, hint && h('small', null, hint));
}
export const formData = (form) => Object.fromEntries(new FormData(form).entries());

// Runs an async action on a button: disables it, shows toast on failure.
export async function run(btn, fn) {
  if (btn) btn.disabled = true;
  try { return await fn(); }
  catch (e) { toast(e.message, 'error'); throw e; }
  finally { if (btn) btn.disabled = false; }
}

export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Book spine colour by category (stable)
const SPINES = { 'Computer Science': '#2F5D86', Mathematics: '#7A2E3A', Literature: '#2E6B55', Reference: '#B07A1E' };
export const spineColor = (cat) => SPINES[cat] || '#59607A';
