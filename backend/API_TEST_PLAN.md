# ULITMS Backend API Test Plan

Run these tests against a dedicated test database, never a live production database. Use the demo seed credentials only for local testing.

## Demo accounts from `02_seed.sql`

- Admin: `admin@ulitms.edu` / `Admin@123`
- Student: `juan@ulitms.edu` / `Student@123`
- Other seeded students use `Student@123`

These are public demo credentials. Change or remove them before deployment.

## 1. Startup and authentication

1. `GET /api/health` — expect `success=true`, `database=connected`, schema `library`.
2. `POST /api/auth/login` with the demo admin — expect a JWT and user object.
3. `POST /api/auth/login` with the demo student — expect a JWT and student role.
4. Attempt login with an incorrect password — expect 401.
5. Set a test user's status to `suspended`; verify that existing JWTs are rejected on the next request.
6. Soft-delete a test user; verify login and authenticated requests are rejected.

## 2. Book catalog and categories

1. `GET /api/books` — only active, non-deleted books should appear.
2. `GET /api/books/search?keyword=database` — verify search by title/author/ISBN.
3. Admin `POST /api/books` — verify the new book starts with `available_copies=total_copies`.
4. Admin changes `total_copies` upward — available copies should increase by the same delta.
5. Attempt to reduce `total_copies` below allocated copies — expect a database constraint error (400).
6. Deactivate a category using `PUT /api/book-categories/:id/status`; existing books retain their category, but new assignments to that category are rejected.

## 3. Borrowing lifecycle and inventory invariant

Use a book with `total_copies=3` and `available_copies=3`.

| Action | Expected status | Expected available copies |
|---|---|---:|
| Student submits request | `pending_approval` | 3 |
| Admin approves | `approved` | 2 |
| Admin records physical issue | `borrowed` | 2 |
| Student requests return | `pending_return` | 2 |
| Admin confirms physical return | `returned` | 3 |

Additional cases:
- Reject a pending request: inventory remains unchanged.
- Submit a duplicate open request for the same student/book: expect conflict.
- Submit a request while overdue or already at the three-open-loan limit: expect conflict.
- Mark an issued/overdue/pending-return book lost: status becomes `lost`; inventory remains reduced.
- Attempt illegal status transitions: expect a conflict/error from the database transition trigger.
- `POST /api/borrowings/mark-overdue` as admin; overdue borrowed records should change to `overdue`.

The core invariant is:
`available_copies = total_copies - count(open allocations)`,
where open allocations are `approved`, `borrowed`, `pending_return`, and `overdue`.

## 4. E-Library sessions

1. Student starts a session on an available unit — unit becomes `in_use` through the database trigger.
2. Same student attempts a second active session — expect conflict from the unique partial index.
3. Another student attempts the occupied unit — expect conflict.
4. Owner ends the session — `time_out` is set and the trigger returns unit status to `available`.
5. Student requests another user's session history — expect 403.
6. Admin can inspect all sessions; students only see their own sessions.

## 5. Peripherals and damage reports

1. Admin creates a peripheral and links it to a unit/category.
2. Admin updates its condition to one of `good`, `damaged`, `repair_needed`, `missing`.
3. Student submits a damage report with exactly one target (`unit_id` OR `peripheral_id`).
4. Submit with neither target or both targets — expect 400 or database constraint failure.
5. Submit unsupported severity/status values — expect 400.
6. Admin moves a report to `under_review`, then `resolved`; verify resolver and timestamp fields.

## 6. Notifications and history

- Borrow request/status changes should create notifications through the database triggers; verify only one notification per event (no duplicate API-side notification).
- Users can read and mark only their own notifications.
- User soft deletion must close active E-Library sessions but must not fabricate returned books or alter borrowing inventory.
- Confirm audit rows exist for write operations and `app_user_id` identifies the acting user where the operation is performed through actor-aware model transactions.

## Completion criteria

Do not mark the backend production-ready until:
- `npm run check` passes.
- `npm run check:db` passes with the actual configured DB role.
- All scenarios above pass on a clean test database.
- The existing frontend has been tested against the endpoint paths, response shapes, and request field names in `README.md`.
- Demo passwords, DB role password, JWT secret, CORS origins, loan duration, and fine policy have been reviewed for deployment.
