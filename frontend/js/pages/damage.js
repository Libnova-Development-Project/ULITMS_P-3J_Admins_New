import { get, put } from '../api.js';
import { h, icon, empty, modal, field, formData, run, toast, chip, ago } from '../ui.js';
import { reportModal } from './report.js';

export async function render(main, ctx) {
  const body = h('div');
  main.append(h('div', { class: 'page-head' },
    h('div', null, h('h1', null, 'Damage reports'), h('p', null, 'Open and under-review reports on e-library computers and peripherals.')),
    h('button', { class: 'btn', onClick: async () => reportModal({ units: await get('/elibrary/units'), onDone: load }) }, icon('plus', 16), 'New report')), body);

  async function load() {
    const rows = await get('/damage-reports');
    body.replaceChildren(!rows.length ? h('div', { class: 'panel' }, empty('No open reports', 'Everything reported has been resolved.'))
      : h('div', { class: 'panel table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Item', 'Problem', 'Severity', 'Reported', 'Status', ''].map((t) => h('th', null, t)))),
        h('tbody', null, rows.map((r) => h('tr', null,
          h('td', null, h('b', null, r.unit_code || r.peripheral_name || '—')),
          h('td', { style: 'max-width:380px' }, h('b', null, r.damage_type), h('div', { class: 'muted' }, r.description)),
          h('td', null, r.severity ? chip(r.severity) : '—'),
          h('td', null, ago(r.reported_at), h('div', { class: 'muted', style: 'font-size:.85rem' }, r.reported_by_name)),
          h('td', null, chip(r.status)),
          h('td', null, h('div', { class: 'cell-actions' }, h('button', { class: 'btn btn-sm', onClick: () => resolve(r) }, 'Resolve')))))))));
    ctx.refreshBadges();
  }

  function resolve(r) {
    const form = h('form', { id: 'res', novalidate: true },
      h('p', null, h('b', null, r.unit_code || r.peripheral_name), ' — ', r.damage_type),
      field('Outcome', h('select', { name: 'status' }, h('option', { value: 'resolved' }, 'Resolved — fixed'), h('option', { value: 'closed' }, 'Closed — no action taken'))),
      field('Condition of the item now', h('select', { name: 'new_condition' }, h('option', { value: '' }, 'Leave unchanged'),
        [['good', 'Good'], ['damaged', 'Damaged'], ['repair_needed', 'Needs repair'], ['missing', 'Missing']].map(([v, l]) => h('option', { value: v }, l)))),
      field('Notes', h('textarea', { name: 'notes', maxlength: 1000, placeholder: 'What was done?' })));
    modal({
      title: 'Resolve report', body: form,
      actions: (close) => [
        h('button', { class: 'btn', type: 'button', onClick: close }, 'Cancel'),
        h('button', { class: 'btn btn-primary', type: 'submit', form: 'res', onClick: async (e) => {
          e.preventDefault();
          const d = formData(form); const payload = { status: d.status };
          if (d.notes?.trim()) payload.notes = d.notes.trim();
          if (d.new_condition) payload.new_condition = d.new_condition;
          try { await run(e.currentTarget, () => put(`/damage-reports/${r.report_id}/resolve`, payload)); toast('Report updated'); close(); load(); } catch { /* toast */ }
        } }, 'Save'),
      ],
    });
  }
  await load();
}
