// Point this at the backend. Default matches ulitms_backend (.env PORT=3000).
export const API_BASE = window.ULITMS_API_BASE || 'http://localhost:3000/api';

// The API has no "list categories" endpoint; these ids come from 02_seed.sql.
// Add rows here if you add categories to the database.
export const CATEGORIES = [
  { id: 1, name: 'Computer Science' },
  { id: 2, name: 'Mathematics' },
  { id: 3, name: 'Literature' },
  { id: 4, name: 'Reference' },
];
