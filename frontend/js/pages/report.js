import { get, post } from '../api.js';
import { h, field, formData, run, toast, modal } from '../ui.js';

const TYPES = ['Cracked screen', 'Not powering on', 'Keyboard or mouse fault', 'Software problem', 'Missing part', 'Other'];

// Shared by the student page, the e-library "Report a problem" button and the admin desk.
export function reportForm({ units, unitId, onDone, id = 'report-form' }) {
  const err = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const form = h('form', { id, novalidate: true }, err,
    field('Computer', h('select', { name: 'unit_id', required: true },
      h('option', { value: '' }, 'Select a computer'),
      units.map((u) => h('option', { value: u.unit_id, selected: u.unit_id === unitId }, `${u.unit_code} — ${u.location || ''}`)))),
    h('div', { class: 'grid-2' },
      field('What kind of problem?', h('select', { name: 'damage_type', required: true }, TYPES.map((t) => h('option', { value: t }, t)))),
      field('How serious is it?', h('select', { name: 'severity' }, h('option', { value: '' }, 'Not sure'),
        [['minor', 'Minor — still usable'], ['moderate', 'Moderate'], ['severe', 'Severe — unusable']].map(([v, l]) => h('option', { value: v }, l))))),
    field('Describe what happened', h('textarea', { name: 'description', required: true, placeholder: 'What did you see? When did it start?' })));
  form.submit = async (btn) => {
    err.hidden = true;
    const d = formData(form);
    if (!d.unit_id) { err.textContent = 'Select the computer that has the problem.'; err.hidden = false; return false; }
    if (!d.description?.trim()) { err.textContent = 'Describe the problem so staff can fix it.'; err.hidden = false; return false; }
    const body = { unit_id: Number(d.unit_id), damage_type: d.damage_type, description: d.description.trim() };
    if (d.severity) body.severity = d.severity;
    try { await run(btn, () => post('/damage-reports', body)); toast('Report sent'); onDone?.(); return true; }
    catch (x) { err.textContent = x.message; err.hidden = false; return false; }
  };
  return form;
}

export function reportModal({ units, unitId, onDone }) {
  const form = reportForm({ units, unitId });
  modal({
    title: 'Report a problem', body: form,
    actions: (close) => [
      h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
      h('button', { class: 'btn btn-primary', type: 'submit', form: form.id, onClick: async (e) => { e.preventDefault(); if (await form.submit(e.currentTarget)) { close(); onDone?.(); } } }, 'Send report'),
    ],
  });
}

export async function render(main) {
  const units = await get('/elibrary/units');
  const slot = h('div', { class: 'panel panel-pad', style: 'max-width:640px' });
  const draw = () => {
    const form = reportForm({ units, onDone: draw });
    slot.replaceChildren(form, h('button', { class: 'btn btn-primary', type: 'button', onClick: (e) => form.submit(e.currentTarget) }, 'Send report'));
  };
  draw();
  main.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Report damage'), h('p', null, 'Tell us about a broken computer so it can be repaired and other students aren’t affected.'))), slot);
}
