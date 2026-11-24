# ULITMS REST API (31 endpoints)

Base URL: `http://localhost:3000/api`. Protected routes need `Authorization: Bearer <token>` (from POST /auth/login).
Responses: `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message": "..." } }`.

| # | Method | Endpoint | Access | Description | PostgreSQL integration |
|---|---|---|---|---|---|
| 1 | POST | `/auth/register` | Public | Register a student account | PROCEDURE sp_register_user (+ trg_users_sanitize, trg_audit_users) |
| 2 | POST | `/auth/login` | Public | Login, returns JWT | FUNCTION fn_get_user_for_login |
| 3 | GET | `/auth/me` | Any user | Current user profile | SELECT users (column-limited) |
| 4 | GET | `/books?keyword=&category_id=` | Any user | Search catalog | FUNCTION fn_search_books |
| 5 | GET | `/books/:id` | Any user | One book | VIEW vw_active_catalog |
| 6 | POST | `/books` | Admin | Add book | INSERT in BEGIN/COMMIT/ROLLBACK + trg_audit_books |
| 7 | PUT | `/books/:id` | Admin | Edit book | UPDATE + trg_books_adjust_available, trg_books_guard_deactivation |
| 8 | DELETE | `/books/:id` | Admin | Soft delete book | UPDATE deleted_at + trg_books_guard_deactivation, trg_books_no_delete |
| 9 | POST | `/borrowings` | Any user | Request a book (pending approval) | PROCEDURE sp_submit_borrow_request + FUNCTION fn_check_borrow_eligibility + trg_borrow_notify_insert |
| 10 | GET | `/borrowings/mine` | Any user | My requests and loans | FUNCTION fn_get_user_borrowings |
| 11 | GET | `/borrowings/pending` | Admin | Approval queue | FUNCTION fn_get_pending_requests |
| 12 | GET | `/borrowings/active` | Admin | Active loans with projected fines | VIEW vw_active_borrowings (uses fn_calculate_fine) |
| 13 | PUT | `/borrowings/:id/decision` | Admin | Approve or reject | PROCEDURE sp_decide_borrow_request (COMMIT / ROLLBACK) + trg_borrow_validate_transition, trg_borrow_notify_status |
| 14 | PUT | `/borrowings/:id/issue` | Admin | Hand the book over (approved to borrowed) | PROCEDURE sp_issue_book |
| 15 | PUT | `/borrowings/:id/return-request` | Owner | Student starts a return | PROCEDURE sp_request_return |
| 16 | PUT | `/borrowings/:id/confirm-return` | Admin | Confirm return, compute fine, restore copy | PROCEDURE sp_confirm_return + FUNCTION fn_calculate_fine |
| 17 | POST | `/borrowings/mark-overdue` | Admin | Run overdue batch | PROCEDURE sp_mark_overdue_borrowings |
| 18 | GET | `/elibrary/units` | Any user | Unit availability | VIEW vw_elibrary_unit_status |
| 19 | POST | `/elibrary/sessions` | Any user | Start a session | PROCEDURE sp_start_elibrary_session + trg_session_sync_unit_start |
| 20 | PUT | `/elibrary/sessions/:id/end` | Owner/Admin | End a session | PROCEDURE sp_end_elibrary_session + trg_session_sync_unit_end |
| 21 | POST | `/damage-reports` | Any user | Report damaged unit/peripheral | PROCEDURE sp_submit_damage_report + trg_damage_notify_insert |
| 22 | GET | `/damage-reports` | Admin | Open reports | VIEW vw_open_damage_reports |
| 23 | PUT | `/damage-reports/:id/resolve` | Admin | Resolve/close report | PROCEDURE sp_resolve_damage_report + trg_damage_notify_status |
| 24 | GET | `/users` | Admin | Users with activity summary | VIEW vw_user_activity |
| 25 | PUT | `/users/:id` | Admin | Edit user / change status | UPDATE + trg_users_sanitize, trg_audit_users |
| 26 | DELETE | `/users/:id` | Admin | Soft delete user | UPDATE deleted_at + trg_users_no_delete |
| 27 | GET | `/notifications` | Any user | My notifications | SELECT notifications |
| 28 | PUT | `/notifications/:id/read` | Owner | Mark as read | UPDATE notifications |
| 29 | GET | `/dashboard` | Admin | Dashboard statistics | FUNCTION fn_get_dashboard_stats |
| 30 | GET | `/reports/inventory` | Admin | Inventory reconciliation | VIEW vw_inventory_check |
| 31 | GET | `/audit-logs?table=&record_id=&operation=&limit=&offset=` | Admin | Audit trail | VIEW vw_audit_trail (filled by trg_fn_audit_row) |

## HTTP status codes

| Status | When |
|---|---|
| 200 / 201 | Success / created |
| 400 | Validation failed, or a business rule rejected the input (RAISE EXCEPTION) |
| 401 | Missing, invalid or expired token; wrong login |
| 403 | Role not allowed (checked in the API and again inside the procedure) |
| 404 | Record or route not found |
| 409 | Conflict: duplicate value, wrong status for the action, no copy left, unit taken |
| 500 | Unexpected server error (details only in the server log) |

## Request body notes
- `PUT /borrowings/:id/decision` body: `{ "decision": "approve" | "reject", "note": "optional text", "loan_days": 1-30 (default 7) }`
- All request bodies are validated strictly: unknown fields are rejected with 400.
