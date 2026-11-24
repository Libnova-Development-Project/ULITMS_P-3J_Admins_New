# ULITMS Frontend

Web app for the ULITMS backend (University Library Inventory and Transaction Management System).
Plain HTML, CSS and JavaScript modules: **no npm install, no build step**. Needs Node 18+ only to serve the files.

## Run it
1. Start the backend (`ulitms_backend`, `npm run dev`) so `http://localhost:3000/api/health` works.
2. In this folder: `npm start`
3. Open http://localhost:5173

Port 5173 matters: the backend's `CORS_ORIGIN` defaults to `http://localhost:5173`.
If your API is elsewhere, edit `API_BASE` in `js/config.js` (or set `window.ULITMS_API_BASE` in index.html).

Demo accounts (seed data): `admin@ulitms.edu / Admin@123`, `juan@ulitms.edu / Student@123`.

No database handy? `npm run mock` starts an in-memory fake API on port 3000 with the same routes and response shapes.

## What's in it (all 31 endpoints are used)
**Students:** register / sign in, catalog shelf with search and category filter, request a book, My loans with progress and
"Return book", E-Library computers (start/end session), report damage, notifications.
**Admins:** dashboard, borrowing desk (approve/decline with loan days and note, hand over, confirm return with fine, run overdue check),
catalog add/edit/remove, E-Library live floor, damage reports (resolve), users (edit status/details, delete),
inventory check, audit log with before/after diffs, notifications.

## Things to know
- The API has no "list categories" endpoint, so categories are listed in `js/config.js` (ids 1-4 from `02_seed.sql`). Add rows there if you add categories.
- The API doesn't say which e-library session belongs to the current student, so the browser remembers the session it started (localStorage). Admins can end any session.
- Damage reports are filed against a computer (unit). The API also accepts a peripheral id, but offers no way to list peripherals.
- Editing a user can't change the email: the backend ignores it.
- Fines are ₱10 per late day (`fn_calculate_fine`).

## Structure
```
index.html          css/styles.css
js/config.js        API address and categories
js/api.js           fetch wrapper, token storage, error messages
js/ui.js            DOM helpers, modal, toast, formatting
js/main.js          router, sidebar, badges
js/pages/*.js       one file per screen
server.js           static server on :5173      dev/mock-api.js  fake API
```
