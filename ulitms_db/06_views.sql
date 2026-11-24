-- =====================================================================
-- ULITMS | File: 06_views.sql   (STEP 2D: views for presentation/reports)
-- Views never expose password_hash.
-- =====================================================================
SET search_path TO library, public;

-- V1. Active catalog: only borrowable, non-deleted books
CREATE OR REPLACE VIEW vw_active_catalog AS
SELECT b.book_id, b.isbn, b.title, b.author, b.publisher, b.publication_year,
       c.category_name, b.total_copies, b.available_copies,
       (b.available_copies > 0) AS is_available
FROM   books b
LEFT JOIN book_categories c ON c.category_id = b.category_id
WHERE  b.status = 'active' AND b.deleted_at IS NULL;

-- V2. Admin approval queue (oldest first)
CREATE OR REPLACE VIEW vw_pending_borrow_requests AS
SELECT t.borrow_id, t.requested_at,
       u.user_id, u.student_number, u.first_name || ' ' || u.last_name AS student_name,
       b.book_id, b.title, b.available_copies
FROM   borrow_transactions t
JOIN   users u ON u.user_id = t.user_id
JOIN   books b ON b.book_id = t.book_id
WHERE  t.status = 'pending_approval'
ORDER BY t.requested_at;

-- V3. Loans that hold a copy, with live overdue days and projected fine
CREATE OR REPLACE VIEW vw_active_borrowings AS
SELECT t.borrow_id, t.status,
       u.student_number, u.first_name || ' ' || u.last_name AS student_name,
       b.title, t.due_date,
       GREATEST(CURRENT_DATE - t.due_date, 0)          AS days_overdue,
       fn_calculate_fine(t.due_date, CURRENT_DATE)      AS projected_fine
FROM   borrow_transactions t
JOIN   users u ON u.user_id = t.user_id
JOIN   books b ON b.book_id = t.book_id
WHERE  t.status IN ('approved', 'borrowed', 'pending_return', 'overdue');

-- V4. E-Library unit status with the current user (if any)
CREATE OR REPLACE VIEW vw_elibrary_unit_status AS
SELECT un.unit_id, un.unit_code, un.location, un.status,
       un.specifications ->> 'cpu'    AS cpu,
       un.specifications ->> 'ram_gb' AS ram_gb,
       s.session_id,
       u.first_name || ' ' || u.last_name AS current_user_name,
       s.time_in
FROM   elibrary_units un
LEFT JOIN elibrary_sessions s ON s.unit_id = un.unit_id AND s.time_out IS NULL
LEFT JOIN users u ON u.user_id = s.user_id
WHERE  un.deleted_at IS NULL;

-- V5. Per-user activity summary (borrowings, fines, sessions, reports)
CREATE OR REPLACE VIEW vw_user_activity AS
SELECT u.user_id, u.student_number, u.first_name || ' ' || u.last_name AS full_name,
       u.role, u.status,
       (SELECT COUNT(*) FROM borrow_transactions t WHERE t.user_id = u.user_id)
                                                          AS total_borrowings,
       (SELECT COUNT(*) FROM borrow_transactions t WHERE t.user_id = u.user_id
           AND t.status IN ('approved','borrowed','pending_return','overdue'))
                                                          AS open_loans,
       (SELECT COALESCE(SUM(t.fine_amount), 0) FROM borrow_transactions t
           WHERE t.user_id = u.user_id)                   AS total_fines,
       (SELECT COUNT(*) FROM elibrary_sessions s WHERE s.user_id = u.user_id)
                                                          AS total_sessions,
       (SELECT COUNT(*) FROM damage_reports d WHERE d.reported_by = u.user_id)
                                                          AS reports_filed
FROM   users u
WHERE  u.deleted_at IS NULL;

-- V6. Unresolved damage reports
CREATE OR REPLACE VIEW vw_open_damage_reports AS
SELECT d.report_id, d.severity, d.status, d.damage_type, d.description, d.reported_at,
       r.first_name || ' ' || r.last_name AS reported_by_name,
       un.unit_code, p.name AS peripheral_name
FROM   damage_reports d
JOIN   users r ON r.user_id = d.reported_by
LEFT JOIN elibrary_units un ON un.unit_id = d.unit_id
LEFT JOIN peripherals p     ON p.peripheral_id = d.peripheral_id
WHERE  d.status IN ('open', 'under_review');

-- V7. Readable audit trail (who changed what, before and after)
CREATE OR REPLACE VIEW vw_audit_trail AS
SELECT a.audit_id, a.changed_at, a.table_name, a.record_id, a.operation,
       a.app_user_id,
       COALESCE(u.first_name || ' ' || u.last_name, 'system/unknown') AS changed_by_user,
       a.changed_by AS db_role, a.old_data, a.new_data
FROM   audit_logs a
LEFT JOIN users u ON u.user_id = a.app_user_id
ORDER BY a.changed_at DESC, a.audit_id DESC;

-- V8. Inventory reconciliation: success indicator "displayed copies agree
--     with recorded transactions". consistent = FALSE would signal a bug.
CREATE OR REPLACE VIEW vw_inventory_check AS
SELECT b.book_id, b.title, b.total_copies, b.available_copies,
       COUNT(t.borrow_id) AS copies_allocated,
       (b.available_copies = b.total_copies - COUNT(t.borrow_id)) AS consistent
FROM   books b
LEFT JOIN borrow_transactions t
       ON t.book_id = b.book_id
      AND t.status IN ('approved', 'borrowed', 'pending_return', 'overdue')
WHERE  b.deleted_at IS NULL
GROUP BY b.book_id;
