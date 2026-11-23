# ULITMS Backend — MVC REST API

This package is a cleaned, MVC-organized backend aligned to the supplied PostgreSQL schema in `ulitms_db/01_schema.sql`.

## Architecture

- `src/routes`: URL/method definitions and middleware only.
- `src/controllers`: HTTP request validation, orchestration, and JSON responses.
- `src/models`: PostgreSQL queries and persistence operations.
- `src/middleware`: authentication, authorization, validation, and error handling.
- `src/config`: environment-driven PostgreSQL pool.
- `src/utils`: shared helpers.
- `database/migrations`: additive schema changes required by this backend.

The separate frontend is the View layer. This is an MVC-style REST API, not a server-rendered HTML MVC application.

## Requirements

- Node.js 18 or newer
- PostgreSQL
- The ULITMS database SQL package

## Database setup

**Warning:** `01_schema.sql` starts with `DROP SCHEMA IF EXISTS library CASCADE`. It deletes the complete `library` schema and all its data. Run it only when creating a fresh database or after a verified backup and explicit decision to reset.

For a fresh database, run the database package in its documented order:
1. `01_schema.sql`
2. `database/migrations/001_category_status_and_damage_target.sql` from this backend package
3. `02_seed.sql` (development/demo only; do not run on production)
4. `03_functions.sql`
5. `04_procedures.sql`
6. `05_triggers.sql`
7. `06_views.sql`
8. `database/security/07_security_secure.sql` (use this in place of the older `07_security.sql`)
9. Set a strong password for `app_user` in pgAdmin or with `\password app_user` in psql.
10. `99_demo_tests.sql` (optional; it may insert demo/test data)

The demo seed inserts public sample accounts, including an administrator with a known demo password. Do not use the seed in production; provision a real administrator securely instead.

If the database already contains data, do not run the destructive schema reset. Back it up, inspect its current migration state, and apply only reviewed additive migrations.

The secure security script grants the restricted API role access to identity sequences, which it needs for inserts. Migration 001 adds `book_categories.status` (`active`/`inactive`) and tightens damage reports so exactly one target is selected: `unit_id` XOR `peripheral_id`. Existing category records are marked active by the default. Existing reports that have both targets set must be corrected before the XOR constraint can be added.

## Configure and run

Open the extracted backend folder in a terminal, then run:

```powershell
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

On PowerShell, `copy` is supported. Edit `.env` and set:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- a unique `JWT_SECRET` with at least 32 characters
- exact `CORS_ORIGIN` values for your frontend

The API uses `DB_SCHEMA=library` by default. The backend calls the SECURITY DEFINER login function from `03_functions.sql`; install the functions and grant routine execution as part of database setup. If using the restricted `app_user` role from `database/security/07_security_secure.sql`, set its password yourself in PostgreSQL/pgAdmin and use that exact value in `.env`. Do not use the sample password embedded in an older copy of the SQL security file; replace it with a strong unique password before granting access.

Then:
```bash
npm run check
npm run check:db
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## Business rules implemented

### Authentication and users
- Public registration always creates a `student`; public registration cannot create an admin.
- Login checks account status and soft deletion.
- JWTs use `sub=user_id`; every authenticated request reloads the user and checks status/deleted_at.
- Password hashes are compared through the database's `fn_get_user_for_login()` SECURITY DEFINER function. The API does not return password hashes.
- Password reset endpoints return HTTP 501 because the supplied schema has no reset-token table or email/SMS delivery service. Avatar uploads are not exposed because the supplied `users` table has no profile-image column. No fake reset process is provided.
- User soft deletion preserves borrowings, damage reports, and audit history. It does not fabricate returns or change book inventory.
- Admin accounts must be provisioned securely by a database administrator; the public API does not let users self-assign admin.

### Books and categories
- Books use `book_id`, `cover_image`, `deleted_at`, `total_copies`, and `available_copies`.
- Availability is an inventory count, not a book status. Book status is `active` or `inactive`.
- Deleting a book is a soft delete and is refused while copies are allocated.
- Book category references are retained. Inactive categories cannot be assigned to new or updated books.
- Changing total copies adjusts available copies by the same delta; the database checks prevent reducing total below allocated inventory.

### Borrowing
- `POST /api/borrowings` creates `pending_approval`; it does not deduct inventory.
- Approval rechecks and reserves one copy atomically (`available_copies - 1`) and records reviewer and due date.
- Physical issue is a separate `approved -> borrowed` step.
- Return request changes status to `pending_return`; it does not restore inventory.
- Admin confirmation changes status to `returned`, calculates the fine, and restores exactly one copy.
- Lost books do not restore inventory. Loss metadata records who marked the item lost.
- Eligibility currently follows the supplied database function's policy: no existing open request for the same title, no overdue borrowing, and at most three open requests/loans. Confirm institutional policy before deployment.
- Loan duration defaults to 7 days and is configurable through `LOAN_DURATION_DAYS` (1–30). The supplied `fn_calculate_fine()` function calculates PHP 10/day. Confirm both policies with the institution before deployment.

### E-Library
- A session is active while `time_out IS NULL`.
- The database's unique partial indexes prevent more than one active session per user or unit.
- Unit status is synchronized by the supplied database triggers.

### Damage reports
- Reports must target exactly one computer unit or peripheral.
- Severity values: `minor`, `moderate`, `severe`.
- Status values: `open`, `under_review`, `resolved`, `closed`.
- Books are not valid damage-report targets in the supplied requirements/schema.

### Notifications and audit
- Borrowing and damage notifications are generated by the supplied database triggers. The API does not duplicate those notifications.
- Audit logs are generated by database triggers. The app should use the provided stored procedures or transaction-local `app.current_user_id` when adding future write workflows.

## API routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Student registration |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Authenticated | Current account |
| POST | `/api/auth/logout` | Authenticated | Client token logout acknowledgement |
| POST | `/api/auth/forgot-password` | Public | Not configured (501) |
| POST | `/api/auth/reset-password` | Public | Not configured (501) |
| GET | `/api/profile` | Authenticated | Current profile |
| PUT | `/api/profile/password` | Authenticated | Change own password |
| GET | `/api/users` | Admin | List users |
| POST | `/api/users` | Admin | Create student account |
| GET/PUT | `/api/users/:id` | Owner/Admin | Read/update profile |
| GET | `/api/users/:id/stats` | Owner/Admin | User statistics |
| PUT | `/api/users/:id/password` | Owner/Admin | Change password (admin may reset) |
| PUT | `/api/users/:id/status` | Admin | Activate/inactivate/suspend |
| DELETE | `/api/users/:id` | Admin | Soft delete |
| GET | `/api/books` | Public | Search/list active books |
| GET | `/api/books/:id` | Public | Book details |
| POST | `/api/books` | Admin | Create book |
| PUT/DELETE | `/api/books/:id` | Admin | Update/soft delete |
| GET | `/api/book-categories` | Public | Active categories |
| GET | `/api/book-categories/all` | Admin | All categories including inactive |
| POST | `/api/book-categories` | Admin | Create category |
| PUT | `/api/book-categories/:id/status` | Admin | Activate/deactivate category |
| POST | `/api/borrowings` | Authenticated | Submit borrowing request |
| GET | `/api/borrowings` | Authenticated | Own borrowings; admin sees all |
| GET | `/api/borrowings/user/:userId` | Owner/Admin | User borrowing history |
| GET | `/api/borrowings/overdue` | Admin | Overdue list |
| GET | `/api/borrowings/pending` | Admin | Pending approval queue |
| POST | `/api/borrowings/mark-overdue` | Admin | Run overdue status refresh |
| PUT | `/api/borrowings/:id/decision` | Admin | Compatibility decision endpoint (`approve` or `reject`) |
| PUT | `/api/borrowings/:id/approve` | Admin | Approve and reserve copy |
| PUT | `/api/borrowings/:id/reject` | Admin | Reject with reason |
| PUT | `/api/borrowings/:id/issue` | Admin | Record physical issue |
| PUT | `/api/borrowings/:id/return` | Owner/Admin | Request return |
| PUT | `/api/borrowings/:id/confirm` | Admin | Confirm physical return |
| PUT | `/api/borrowings/:id/lost` | Admin | Record lost book |
| GET/POST | `/api/elibrary/units` | Auth/Admin | List/create units |
| GET/PUT/DELETE | `/api/elibrary/units/:id` | Auth/Admin | Read/update/deactivate unit |
| GET | `/api/elibrary/sessions` | Auth | Own sessions; admin may filter all |
| GET | `/api/elibrary/sessions/active` | Auth | Active sessions visible to the current user/admin |
| GET | `/api/elibrary/sessions/user/:userId` | Owner/Admin | Session history |
| POST | `/api/elibrary/sessions/start` | Auth | Start session |
| PUT | `/api/elibrary/sessions/:id/end` | Owner/Admin | End session |
| GET | `/api/peripherals` | Auth | List peripherals |
| GET/POST | `/api/peripherals/categories` | Auth/Admin | List/create categories |
| POST/PUT/DELETE | `/api/peripherals` and `/:id` | Admin | Manage peripherals |
| GET | `/api/damage-reports/mine` | Auth | List the current user's reports |
| GET/POST | `/api/damage-reports` | Auth | List (admin), submit report |
| GET | `/api/damage-reports/:id` | Owner/Admin | Read report |
| PUT | `/api/damage-reports/:id/status` | Admin | Update status |
| GET | `/api/damage-reports/stats` | Admin | Report statistics |
| GET | `/api/notifications` | Auth | Own notifications |
| PUT | `/api/notifications/mark-all-read` | Auth | Mark all read |
| PUT | `/api/notifications/:id/mark-read` | Auth | Mark one read |

## Validation and limits

- JSON body limit: 1 MB.
- Pagination limit: 1–200 records per page.
- IDs must be positive integers.
- Database unique/check/foreign-key errors are mapped to client-safe 4xx responses.
- CORS uses an explicit comma-separated origin allowlist.
- Helmet security headers are enabled.
- Rate limits are applied globally and more strictly to authentication endpoints.

## Verification status and known limitations

- `npm run check` performs JavaScript syntax checks only.
- `npm run check:db` checks required schema columns, migrations, and the login function using the configured database account.
- No live PostgreSQL integration tests were run in this environment because database credentials and a live test database were not provided.
- This source is aligned to the supplied SQL files by column/table names, but actual deployment must run the SQL package and migration first.
- The frontend was not included in `backend.zip`; existing frontend endpoint/JSON expectations must be regression-tested against this API before replacing the currently running backend. A few legacy field aliases (`id`, `student_id`, `cover_image_url`, `unit_number`) are returned to ease migration, but they are not a substitute for frontend regression tests.
- The API currently uses database-backed notification triggers. If the database trigger package is not installed, notifications for borrow/damage workflows will not be generated.
- Admin account provisioning and password reset delivery require institutional/operational procedures not present in the supplied schema.


See [`API_TEST_PLAN.md`](API_TEST_PLAN.md) for the detailed end-to-end verification checklist. The seeded demo credentials (`Admin@123`, `Student@123`) are public examples and must not be used in production.
