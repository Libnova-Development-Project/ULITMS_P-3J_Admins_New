import { API_BASE } from './config.js';

const KEY = 'ulitms.session';
export const session = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Turns the zod `details` object into one readable sentence.
function describe(err) {
  const f = err.details?.fieldErrors;
  if (f) {
    const parts = Object.entries(f).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v[0]}`);
    if (parts.length) return parts.join('. ');
  }
  const form = err.details?.formErrors?.[0];
  return form || err.message;
}

export async function api(method, path, { body, query, auth = true } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)) : '';
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const s = session.get();
  if (auth && s?.token) headers.Authorization = `Bearer ${s.token}`;
  let res;
  try {
    res = await fetch(API_BASE + path + qs, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_BASE}. Check that the backend is running.`);
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !json?.success) {
    const e = new ApiError(res.status, json?.error?.message || `Request failed (${res.status})`, json?.error?.details);
    e.message = describe(e);
    if (res.status === 401 && auth && path !== '/auth/login') onUnauthorized();
    throw e;
  }
  return json.data;
}

export const get = (p, query) => api('GET', p, { query });
export const post = (p, body, o) => api('POST', p, { body, ...o });
export const put = (p, body) => api('PUT', p, { body });
export const del = (p) => api('DELETE', p);
