import { post, session } from '../api.js';
import { h, clear, field, formData, run, toast } from '../ui.js';

const SPINES = ['#2F5D86', '#7A2E3A', '#2E6B55', '#B07A1E', '#59607A', '#8A4B2A', '#3C7A8C', '#6B3F73'];
function shelfArt() {
  const items = [];
  for (let i = 0; i < 22; i++) {
    const w = 22 + ((i * 17) % 5) * 7, ht = 120 + ((i * 53) % 9) * 14;
    items.push(h('i', { style: `--c:${SPINES[(i * 3) % SPINES.length]};--w:${w}px;--h:${ht}px;--i:${i}` }));
  }
  items.push(h('i', { class: 'lean', style: `--c:${SPINES[2]};--w:26px;--h:170px;--i:23` }));
  return h('div', { class: 'auth-shelf', 'aria-hidden': 'true' }, items);
}

export function renderAuth(root, mode, { onSignedIn }) {
  const isLogin = mode === 'login';
  const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const showErr = (m) => { err.textContent = m; err.hidden = !m; };

  const form = isLogin ? loginForm(showErr, onSignedIn) : registerForm(showErr);
  clear(root).append(h('div', { class: 'auth' },
    h('section', { class: 'auth-art' },
      h('div', null,
        h('h1', null, 'Borrow, study and return — all in one place.'),
        h('p', null, 'Request books, reserve an e-library PC and track your loans at the university library.')),
      shelfArt()),
    h('section', { class: 'auth-form' },
      h('h2', null, isLogin ? 'Sign in' : 'Create a student account'),
      h('p', { class: 'muted' }, isLogin ? 'Use your university email and password.' : 'Only students can register. Staff accounts are created by the library.'),
      err, form,
      h('p', { class: 'muted', style: 'margin-top:18px' },
        isLogin ? 'New here? ' : 'Already registered? ',
        h('a', { href: isLogin ? '#/register' : '#/login' }, isLogin ? 'Create an account' : 'Sign in')),
      isLogin && demo(form))));
  form.querySelector('input')?.focus();
}

function loginForm(showErr, onSignedIn) {
  const form = h('form', { novalidate: true },
    field('Email', h('input', { type: 'email', name: 'email', required: true, autocomplete: 'username' })),
    field('Password', h('input', { type: 'password', name: 'password', required: true, autocomplete: 'current-password' })),
    h('button', { class: 'btn btn-primary', type: 'submit', style: 'width:100%' }, 'Sign in'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); showErr('');
    const d = formData(form);
    if (!d.email || !d.password) return showErr('Enter your email and password.');
    try {
      await run(form.querySelector('button'), async () => {
        const r = await post('/auth/login', d, { auth: false });
        session.set({ token: r.token, role: r.role, user_id: r.user_id });
      });
      onSignedIn();
    } catch (x) { showErr(x.message); }
  });
  return form;
}

function demo(form) {
  const fill = (email, pw) => { form.email.value = email; form.password.value = pw; form.password.focus(); };
  return h('div', { class: 'demo' }, 'Demo accounts from the seed data:',
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => fill('juan@ulitms.edu', 'Student@123') }, 'Fill student'),
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => fill('admin@ulitms.edu', 'Admin@123') }, 'Fill admin')));
}

function registerForm(showErr) {
  const form = h('form', { novalidate: true },
    h('div', { class: 'grid-2' },
      field('First name', h('input', { type: 'text', name: 'first_name', required: true, autocomplete: 'given-name' })),
      field('Last name', h('input', { type: 'text', name: 'last_name', required: true, autocomplete: 'family-name' }))),
    h('div', { class: 'grid-2' },
      field('Student number', h('input', { type: 'text', name: 'student_number', required: true, placeholder: '24-A-01234' })),
      field('Year level', h('select', { name: 'year_level' }, h('option', { value: '' }, 'Select'), [1, 2, 3, 4].map((n) => h('option', { value: n }, `Year ${n}`))))),
    field('Course', h('input', { type: 'text', name: 'course', placeholder: 'BS Information Systems' })),
    field('Email', h('input', { type: 'email', name: 'email', required: true, autocomplete: 'email' })),
    field('Password', h('input', { type: 'password', name: 'password', required: true, minlength: 8, autocomplete: 'new-password' }), 'At least 8 characters.'),
    h('button', { class: 'btn btn-primary', type: 'submit', style: 'width:100%' }, 'Create account'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); showErr('');
    const d = formData(form);
    for (const k of Object.keys(d)) if (d[k] === '') delete d[k];     // backend rejects empty optional values
    if (d.year_level) d.year_level = Number(d.year_level);
    try {
      await run(form.querySelector('button'), () => post('/auth/register', d, { auth: false }));
      toast('Account created. Sign in to continue.');
      location.hash = '#/login';
    } catch (x) { showErr(x.message); }
  });
  return form;
}
