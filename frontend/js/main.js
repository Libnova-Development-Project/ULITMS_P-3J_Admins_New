import { get, session, setUnauthorizedHandler } from './api.js';
import { h, $, icon, clear, loading, errorState, toast } from './ui.js';
import { renderAuth } from './pages/auth.js';

const root = $('#root');
const state = { user: null, badges: {}, cleanup: null, pollTimer: null };

const NAV = {
  student: [
    { path: 'catalog', label: 'Catalog', icon: 'catalog' },
    { path: 'loans', label: 'My loans', icon: 'loans', badge: 'loans' },
    { path: 'library', label: 'E-Library', icon: 'monitor' },
    { path: 'report', label: 'Report damage', icon: 'wrench' },
    { path: 'notifications', label: 'Notifications', icon: 'bell', badge: 'unread' },
  ],
  admin: [
    { path: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { path: 'approvals', label: 'Borrowing desk', icon: 'check', badge: 'desk' },
    { path: 'catalog', label: 'Catalog', icon: 'catalog' },
    { path: 'library', label: 'E-Library', icon: 'monitor' },
    { path: 'damage', label: 'Damage reports', icon: 'wrench', badge: 'damage' },
    { group: 'Administration' },
    { path: 'users', label: 'Users', icon: 'users' },
    { path: 'inventory', label: 'Inventory check', icon: 'scale' },
    { path: 'audit', label: 'Audit log', icon: 'scroll' },
    { path: 'notifications', label: 'Notifications', icon: 'bell', badge: 'unread' },
  ],
};
const PAGES = {
  dashboard: ['admin', () => import('./pages/dashboard.js')],
  approvals: ['admin', () => import('./pages/approvals.js')],
  catalog: ['any', () => import('./pages/catalog.js')],
  loans: ['student', () => import('./pages/loans.js')],
  library: ['any', () => import('./pages/library.js')],
  report: ['student', () => import('./pages/report.js')],
  damage: ['admin', () => import('./pages/damage.js')],
  users: ['admin', () => import('./pages/users.js')],
  inventory: ['admin', () => import('./pages/inventory.js')],
  audit: ['admin', () => import('./pages/audit.js')],
  notifications: ['any', () => import('./pages/notifications.js')],
};

export const navigate = (path) => { location.hash = '#/' + path; };
const home = () => (state.user?.role === 'admin' ? 'dashboard' : 'catalog');

export function logout(message) {
  session.clear(); state.user = null; state.badges = {};
  clearInterval(state.pollTimer);
  navigate('login');
  if (message) toast(message, 'error');
}
setUnauthorizedHandler(() => logout('Your session expired. Sign in again.'));

export async function refreshBadges() {
  if (!state.user) return;
  const b = {};
  try {
    const notes = await get('/notifications');
    b.unread = notes.filter((n) => !n.is_read).length;
    if (state.user.role === 'admin') {
      const s = await get('/dashboard');
      b.desk = Number(s.pending_requests) + Number(s.pending_returns);
      b.damage = Number(s.open_damage_reports);
    } else {
      const loans = await get('/borrowings/mine');
      b.loans = loans.filter((l) => l.out_status === 'approved').length;
    }
  } catch { /* badges are best-effort */ }
  state.badges = b;
  document.querySelectorAll('[data-badge]').forEach((el) => {
    const n = b[el.dataset.badge];
    el.textContent = n || ''; el.hidden = !n;
  });
}

function shell() {
  const role = state.user.role;
  const nav = h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV[role].map((i) => i.group
    ? h('div', { class: 'nav-group' }, i.group)
    : h('a', { href: '#/' + i.path, dataset: { path: i.path } }, icon(i.icon), i.label,
      i.badge && h('span', { class: 'badge', dataset: { badge: i.badge }, hidden: true }))));
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  clear(root).append(h('div', { class: 'app' },
    h('aside', { class: 'side' },
      h('a', { class: 'brand', href: '#/' + home(), 'aria-label': 'ULITMS home' },
        h('span', { class: 'logo' }, h('i'), h('i'), h('i')),
        h('span', null, h('b', null, 'ULITMS'), h('small', null, 'University Library'))),
      nav,
      h('div', { class: 'side-foot' },
        h('div', null, h('b', null, state.user.first_name ? `${state.user.first_name} ${state.user.last_name}` : state.user.email),
          h('span', null, role === 'admin' ? 'Administrator' : `Student${state.user.student_number ? ' · ' + state.user.student_number : ''}`)),
        h('button', { type: 'button', onClick: () => logout() }, icon('out', 16), 'Sign out'))),
    main));
  return main;
}

async function route() {
  const [, raw] = location.hash.match(/^#\/([\w-]*)/) || [];
  const name = raw || '';
  const s = session.get();

  state.cleanup?.(); state.cleanup = null;

  if (!s?.token) {
    if (name !== 'register') { if (name !== 'login') return navigate('login'); }
    document.title = 'Sign in — ULITMS';
    return renderAuth(root, name === 'register' ? 'register' : 'login', { onSignedIn });
  }
  if (!state.user) {
    clear(root).append(loading('Opening the library'));
    try { state.user = await get('/auth/me'); }
    catch (e) { if (e.status === 401) return; clear(root).append(errorState(e, () => route())); return; }
    shell();
    refreshBadges();
    state.pollTimer = setInterval(refreshBadges, 60000);
  }
  if (name === 'login' || name === 'register' || !PAGES[name]) return navigate(home());
  const [who, load] = PAGES[name];
  if (who !== 'any' && who !== state.user.role) return navigate(home());

  let main = $('#main');
  if (!main) main = shell();
  document.querySelectorAll('.nav a').forEach((a) => (a.dataset.path === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  clear(main).append(loading());
  try {
    const mod = await load();
    if (location.hash !== `#/${raw}`) return;           // user navigated away while loading
    clear(main);
    const ctx = { user: state.user, navigate, refreshBadges };
    const cleanup = await mod.render(main, ctx);
    if (typeof cleanup === 'function') state.cleanup = cleanup;
    document.title = `${document.querySelector('.nav a[aria-current]')?.textContent || 'ULITMS'} — ULITMS`;
    main.focus({ preventScroll: true });
    refreshBadges();
  } catch (e) {
    clear(main).append(errorState(e, route));
  }
}

async function onSignedIn() {
  state.user = null;
  navigate('');           // hashchange -> route() reloads the profile and builds the shell
}

addEventListener('hashchange', route);
route();
