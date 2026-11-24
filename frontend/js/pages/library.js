import { get, post, put } from '../api.js';
import { h, empty, errorState, modal, field, formData, run, toast, chip, fmtDateTime, ago, plural } from '../ui.js';
import { reportModal } from './report.js';

const KEY = (u) => `ulitms.session.${u}`;
const mine = {
  get: (u) => { try { return JSON.parse(localStorage.getItem(KEY(u))); } catch { return null; } },
  set: (u, v) => { try { v ? localStorage.setItem(KEY(u), JSON.stringify(v)) : localStorage.removeItem(KEY(u)); } catch { /* ignore */ } },
};

export async function render(main, ctx) {
  const isAdmin = ctx.user.role === 'admin';
  const uid = ctx.user.user_id;
  const floor = h('div');
  main.append(h('div', { class: 'page-head' },
    h('div', null, h('h1', null, 'E-Library'), h('p', null, isAdmin ? 'Live view of every computer. You can end any session.' : 'Pick a free computer and start a session. End it when you leave so others can use it.'))), floor);

  let units = [];
  async function load() {
    try { units = await get('/elibrary/units'); } catch (e) { floor.replaceChildren(errorState(e, load)); return; }
    draw();
  }

  function draw() {
    floor.replaceChildren();
    if (!units.length) { floor.append(empty('No computers set up', 'An administrator needs to add e-library units.')); return; }
    const m = mine.get(uid);
    if (m && !units.some((u) => u.session_id === m.session_id)) mine.set(uid, null);
    const rooms = Map.groupBy ? Map.groupBy(units, (u) => u.location || 'Other') : units.reduce((a, u) => a.set(u.location || 'Other', [...(a.get(u.location || 'Other') || []), u]), new Map());
    for (const [room, list] of rooms) {
      const free = list.filter((u) => u.status === 'available').length;
      floor.append(h('section', { class: 'room' },
        h('h2', null, room, h('span', { class: 'muted', style: 'font-weight:400;margin-left:10px;font-size:.9rem' }, `${free} of ${list.length} free`)),
        h('div', { class: 'desks' }, list.map(desk))));
    }
  }

  function desk(u) {
    const m = mine.get(uid);
    const isMine = m && m.session_id === u.session_id && u.session_id != null;
    const acts = [];
    if (u.status === 'available') acts.push(h('button', { class: 'btn btn-sm btn-primary', onClick: () => startSession(u) }, 'Start session'));
    if (u.status === 'in_use' && (isMine || isAdmin) && u.session_id) acts.push(h('button', { class: 'btn btn-sm', onClick: (e) => endSession(u, e.currentTarget) }, isMine ? 'End my session' : 'End session'));
    acts.push(h('button', { class: 'btn btn-sm btn-ghost', onClick: () => reportModal({ units, unitId: u.unit_id }) }, 'Report a problem'));
    return h('article', { class: `panel desk ${u.status}${isMine ? ' mine' : ''}` },
      h('header', null, h('span', { class: 'code' }, u.unit_code), chip(u.status)),
      h('div', { class: 'specs' }, [u.cpu, u.ram_gb && `${u.ram_gb} GB RAM`].filter(Boolean).join(' · ') || 'Specs not listed'),
      u.status === 'in_use' && h('div', { class: 'who' }, isMine ? 'You' : (u.current_user_name || 'Another user'), ' · since ', h('time', { datetime: u.time_in, title: fmtDateTime(u.time_in) }, ago(u.time_in))),
      h('div', { class: 'acts' }, acts));
  }

  function startSession(u) {
    const form = h('form', { id: 'sess', novalidate: true }, field('What will you use it for?', h('input', { type: 'text', name: 'purpose', maxlength: 200, placeholder: 'Research, printing, group study…' }), 'Optional.'));
    modal({
      title: `Start session on ${u.unit_code}`, body: form,
      actions: (close) => [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
        h('button', { class: 'btn btn-primary', type: 'submit', form: 'sess', onClick: async (e) => {
          e.preventDefault();
          const body = { unit_id: u.unit_id }; const p = formData(form).purpose?.trim(); if (p) body.purpose = p;
          try {
            const r = await run(e.currentTarget, () => post('/elibrary/sessions', body));
            mine.set(uid, { session_id: r.session_id, unit_id: u.unit_id });
            toast(`Session started on ${u.unit_code}`); close(); load();
          } catch { /* toast */ }
        } }, 'Start session'),
      ],
    });
  }

  async function endSession(u, btn) {
    try { await run(btn, () => put(`/elibrary/sessions/${u.session_id}/end`)); toast(`Session on ${u.unit_code} ended`); if (mine.get(uid)?.session_id === u.session_id) mine.set(uid, null); load(); } catch { /* toast */ }
  }

  await load();
  const t = setInterval(load, 30000);
  return () => clearInterval(t);
}
