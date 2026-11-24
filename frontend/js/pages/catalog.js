import { get, post, put, del } from '../api.js';
import { CATEGORIES } from '../config.js';
import { h, icon, clear, loading, empty, errorState, modal, confirmBox, field, formData, run, toast, debounce, spineColor, plural } from '../ui.js';

export async function render(main, ctx) {
  const isAdmin = ctx.user.role === 'admin';
  const q = { keyword: '', category: '' };
  const shelf = h('div', { class: 'shelf', role: 'list' });
  const count = h('p', { class: 'muted', 'aria-live': 'polite' });

  const search = h('input', { type: 'search', id: 'kw', placeholder: 'Title, author or ISBN', 'aria-label': 'Search books' });
  const pills = h('div', { class: 'filters', role: 'group', 'aria-label': 'Category' });
  const drawPills = () => {
    clear(pills).append(
      ...[{ id: '', name: 'All' }, ...CATEGORIES].map((c) => h('button', {
        class: 'pill', type: 'button', 'aria-pressed': String(q.category === String(c.id)),
        onClick: () => { q.category = String(c.id); drawPills(); load(); },
      }, c.name)));
  };

  main.append(
    h('div', { class: 'page-head' },
      h('div', null, h('h1', null, 'Catalog'), h('p', null, isAdmin ? 'Add, edit and remove books. Select a book to see its details.' : 'Find a book and request it. A librarian approves each request.')),
      isAdmin && h('button', { class: 'btn btn-primary', onClick: () => bookForm(null, load, ctx) }, icon('plus', 16), 'Add book')),
    h('div', { class: 'filters' }, h('div', { class: 'search' }, icon('search', 18), search)),
    pills,
    h('div', { class: 'shelf-legend' }, CATEGORIES.map((c) => h('span', null, h('i', { style: `background:${spineColor(c.name)}` }), c.name))),
    count, shelf);
  drawPills();
  search.addEventListener('input', debounce(() => { q.keyword = search.value.trim(); load(); }, 250));

  let seq = 0;
  async function load() {
    const my = ++seq;
    clear(shelf).append(loading('Searching the shelves'));
    try {
      const books = await get('/books', { keyword: q.keyword, category_id: q.category });
      if (my !== seq) return;
      clear(shelf);
      count.textContent = plural(books.length, 'book') + (q.keyword ? ` matching “${q.keyword}”` : '');
      if (!books.length) { shelf.append(empty('No books found', 'Try a different word or clear the category filter.')); return; }
      books.forEach((b) => shelf.append(spine(b)));
    } catch (e) { if (my === seq) clear(shelf).append(errorState(e, load)); }
  }

  function spine(b) {
    const id = b.out_book_id;
    const w = 40 + ((id * 7) % 5) * 6, ht = 190 + ((id * 13) % 6) * 14;
    const out = b.out_available_copies < 1;
    return h('div', { class: 'slot', role: 'listitem' },
      h('button', {
        class: `spine${out ? ' out' : ''}`, type: 'button', style: `--w:${w}px;--h:${ht}px;--c:${spineColor(b.out_category_name)}`,
        'aria-label': `${b.out_title} by ${b.out_author}, ${out ? 'no copies available' : plural(b.out_available_copies, 'copy', 'copies') + ' available'}`,
        onClick: () => openBook(id),
      }, h('span', { class: 'band' }), h('span', { class: 't' }, b.out_title), h('span', { class: 'a' }, b.out_author)));
  }

  async function openBook(id) {
    let b;
    try { b = await get(`/books/${id}`); } catch (e) { return toast(e.message, 'error'); }
    const total = Number(b.total_copies), avail = Number(b.available_copies);
    const body = h('div', { class: 'book-detail' },
      h('h3', null, b.title), h('p', { class: 'muted' }, b.author),
      h('div', { class: 'copies' }, h('b', { class: 'num' }, avail), h('span', { class: 'muted' }, `of ${plural(total, 'copy', 'copies')} on the shelf`)),
      h('div', { class: 'pips', 'aria-hidden': 'true' }, Array.from({ length: Math.min(total, 40) }, (_, i) => h('i', { class: i < avail ? '' : 'gone' }))),
      h('dl', null,
        h('dt', null, 'Category'), h('dd', null, b.category_name || '—'),
        h('dt', null, 'Publisher'), h('dd', null, b.publisher || '—'),
        h('dt', null, 'Year'), h('dd', null, b.publication_year || '—'),
        h('dt', null, 'ISBN'), h('dd', { class: 'num' }, b.isbn || '—')));
    const m = modal({
      title: 'Book details', side: true, body,
      actions: (close) => isAdmin ? [
        h('button', { class: 'btn btn-danger', type: 'button', onClick: async () => {
          if (!(await confirmBox({ title: 'Remove book', message: `Remove “${b.title}” from the catalog? Existing loans are not affected.`, confirmLabel: 'Remove book', danger: true }))) return;
          try { await del(`/books/${id}`); toast('Book removed'); close(); load(); } catch (e) { toast(e.message, 'error'); }
        } }, icon('trash', 16), 'Remove'),
        h('button', { class: 'btn', type: 'button', onClick: () => { close(); bookForm(b, load, ctx); } }, icon('edit', 16), 'Edit'),
      ] : [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Close'),
        h('button', { class: 'btn btn-primary', type: 'button', disabled: avail < 1, onClick: async (e) => {
          try {
            await run(e.currentTarget, () => post('/borrowings', { book_id: id }));
            toast('Request sent. You will be notified when it is decided.'); close(); load(); ctx.refreshBadges();
          } catch { /* toast shown */ }
        } }, avail < 1 ? 'No copies available' : 'Request to borrow'),
      ],
    });
    return m;
  }

  load();
}

export function bookForm(book, reload) {
  const isEdit = !!book;
  const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const form = h('form', { id: 'book-form', novalidate: true },
    err,
    field('Title', h('input', { type: 'text', name: 'title', required: true, maxlength: 200, value: book?.title || '' })),
    field('Author', h('input', { type: 'text', name: 'author', required: true, maxlength: 150, value: book?.author || '' })),
    h('div', { class: 'grid-2' },
      field('Publisher', h('input', { type: 'text', name: 'publisher', maxlength: 100, value: book?.publisher || '' })),
      field('Publication year', h('input', { type: 'number', name: 'publication_year', min: 1400, max: 2100, value: book?.publication_year || '' }))),
    h('div', { class: 'grid-2' },
      field('ISBN', h('input', { type: 'text', name: 'isbn', maxlength: 20, value: book?.isbn || '' })),
      field('Category', h('select', { name: 'category_id' }, h('option', { value: '' }, 'None'),
        CATEGORIES.map((c) => h('option', { value: c.id, selected: book?.category_name === c.name }, c.name))))),
    field('Total copies', h('input', { type: 'number', name: 'total_copies', min: 0, max: 100000, required: true, value: book ? book.total_copies : 1 }),
      isEdit ? 'Available copies adjust automatically.' : null));
  modal({
    title: isEdit ? 'Edit book' : 'Add book', body: form,
    actions: (close) => [
      h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
      h('button', { class: 'btn btn-primary', type: 'submit', form: 'book-form', onClick: async (e) => {
        e.preventDefault(); err.hidden = true;
        const d = formData(form);
        if (!d.title?.trim() || !d.author?.trim()) { err.textContent = 'Title and author are required.'; err.hidden = false; return; }
        const body = {};
        for (const [k, v] of Object.entries(d)) {
          if (v === '') { if (isEdit && k === 'category_id') body[k] = null; continue; }
          body[k] = ['publication_year', 'category_id', 'total_copies'].includes(k) ? Number(v) : v;
        }
        if (isEdit && !body.category_id && !('category_id' in body)) body.category_id = null;
        try {
          await run(e.currentTarget, () => (isEdit ? put(`/books/${book.book_id}`, body) : post('/books', body)));
          toast(isEdit ? 'Book saved' : 'Book added'); close(); reload();
        } catch (x) { err.textContent = x.message; err.hidden = false; }
      } }, isEdit ? 'Save changes' : 'Add book'),
    ],
  });
}
