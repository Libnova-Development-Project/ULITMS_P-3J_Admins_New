# ULITMS Frontend — Backend Compatibility Update

## Local development
1. Start PostgreSQL and the ULITMS MVC backend (`npm run dev` in the backend project).
2. Confirm `http://localhost:5000/api/health` returns HTTP 200.
3. Serve this `frontend/` directory with VS Code Live Server or another static server.
4. Open `login.html` or `admin-login.html`.
5. The API client targets `http://localhost:5000/api` by default. To change it, define `window.ULITMS_API_BASE_URL` before loading `js/api-node.js` / `js/api.js`.

## Important integration behavior
- Login sends `{ email, password }`; the backend does not authenticate by student ID.
- Login response token and user are read from `response.data.token` and `response.data.user`.
- Student registration sends `student_number`; the backend also accepts legacy `student_id`.
- Students submit borrowing requests with `{ book_id }`. They do not choose `user_id` or `due_date`.
- Borrowing flow is pending approval → approved/reserved → borrowed/issued → pending return → librarian confirms return. A student's return click only requests return; it does not restore inventory.
- Password recovery currently returns HTTP 501 because reset-token storage and email/PIN delivery are not implemented in the backend. The login page now explains this instead of pretending recovery works.
- Profile image upload and System Settings persistence are not implemented by the current backend routes. Those UI controls need either backend support or should remain disabled/not presented as saved.
- The backend CORS allowlist must include the exact frontend origin (for example `http://127.0.0.1:5500` or `http://localhost:5500`) in `CORS_ORIGIN`.

## Compatibility changes made
- Replaced the duplicate legacy API client with one shared JWT-aware client and compatibility adapters.
- Corrected authentication payload and response handling.
- Added support for `/api/auth/me`, `/api/profile/password`, `/api/book-categories`, notification routes, and the current borrowing lifecycle.
- Changed user status updates from PATCH to PUT.
- Corrected page API base URLs to point to the backend on port 5000.
- Corrected nested `{ success, data: ... }` response parsing in key pages.
- Preserved existing HTML/CSS layout and visual styling.

## Validation
- JavaScript syntax checks: all frontend JS files pass.
- Inline HTML script syntax checks: all inline scripts pass.
- Live browser regression tests still need to be run against the user's local database and browser. This package does not claim that every module has passed runtime testing.
