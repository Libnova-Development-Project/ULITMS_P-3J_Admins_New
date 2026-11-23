# ULITMS Backend Refactor — Implementation Summary

## Completed in this package

- Replaced the active backend source with one canonical `src/` MVC implementation.
- Removed duplicated root-level legacy source folders and obsolete schema snapshots.
- Moved all SQL out of routes and controllers into models.
- Updated database queries from legacy `library_schema` names to the supplied `library` schema and current primary-key/column names.
- Reworked authentication to use the supplied `fn_get_user_for_login()` SECURITY DEFINER function so the restricted API role does not need direct SELECT access to `password_hash`.
- Restricted public registration and API-created accounts to the `student` role. The secure database role script grants no INSERT/UPDATE privilege on the `users.role` column.
- Reworked borrowing to preserve the agreed lifecycle and inventory timing:
  - request: pending_approval, no inventory deduction
  - approval: reserve one copy atomically
  - issue: borrowed
  - return request: pending_return, no inventory restoration
  - admin return confirmation: returned, calculate fine using `fn_calculate_fine`, restore one copy
  - lost: record loss, do not restore inventory
- Added request eligibility checks from the current database rules (no overdue item, no duplicate open title, maximum three open requests/loans).
- Fixed user deactivation/deletion so active E-Library sessions are closed but book borrowings are not fabricated as returned.
- Reworked E-Library session handling to use the current `session_id`, `unit_id`, `time_in`, and `time_out` fields and rely on unique active-session indexes and database triggers.
- Reworked damage reports to support exactly one target: a computer unit OR a peripheral; removed unsupported book-damage behavior.
- Reworked notifications to use `notification_id` and recipient scoping.
- Added `database/migrations/001_category_status_and_damage_target.sql`.
- Added a secure replacement for the old database security script at `database/security/07_security_secure.sql`. It omits the known sample database password, grants identity-sequence access, and prevents the API role from assigning/changing user roles.
- Added `scripts/check-syntax.js` and `scripts/check-db.js`.
- Added detailed `README.md` and `API_TEST_PLAN.md`.
- Removed unused upload middleware and unused dependencies for the removed upload/validation paths.
- Added compatibility response aliases for legacy frontend fields where safe.

## Validation performed

- `npm run check`: passed; all 33 checked JavaScript files passed `node --check`.
- Application module load: passed using the dependency tree from the supplied archive and placeholder environment variables.
- HTTP smoke test: unknown API endpoint returned the expected JSON 404.
- Static scan: no `library_schema`, `is_deleted`, `processed_by`, `activity_logs`, `monitored_by`, or `damage_metadata` references remain in active JavaScript source.
- Static architecture scan: no direct SQL calls remain in route or controller files.

## Not yet verified

- No live PostgreSQL integration test was run. No live database credentials or test database were provided.
- `npm run check:db` must be run by the user against the actual PostgreSQL database after applying the migration and SQL setup.
- The frontend was not included in the uploaded `backend.zip`. Frontend endpoint and JSON response regression tests remain necessary before replacing the running backend.
- The SQL `01_schema.sql` contains a destructive `DROP SCHEMA IF EXISTS library CASCADE`. Do not run it against an existing database with data.
- Seed data includes public demo credentials. Do not use those credentials in production.
- Institution policy values (loan duration, borrowing limit, and PHP 10/day fine) must be confirmed before deployment.

## Completion status

The code-level MVC and database compatibility refactor is complete as a source package. It is **not certified production-ready** until database migration, `npm run check:db`, full API workflow tests, and frontend regression tests pass.
