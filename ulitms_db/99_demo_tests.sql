-- =====================================================================
-- ULITMS | File: 99_demo_tests.sql  (use for your LIVE demo / defense)
-- Walks through every required demonstration:
--   functions, procedures, automatic triggers, transactions (COMMIT /
--   ROLLBACK), audit logging. Lines marked (EXPECT ERROR) must fail.
-- Run: psql -d ulitms -f 99_demo_tests.sql      (fresh seed data assumed)
-- Users: 1 = admin, 2 = Juan, 3 = Maria, 4 = Pedro.  Book 3 has ONE copy.
-- =====================================================================
SET search_path TO library, public;
\set ON_ERROR_STOP off
\pset pager off

\echo '==== 1. FUNCTIONS ===='
SELECT fn_calculate_fine(CURRENT_DATE - 3, CURRENT_DATE) AS fine_3_days_late;
SELECT * FROM fn_check_borrow_eligibility(2, 3);
SELECT * FROM fn_check_borrow_eligibility(2, 999);                 -- not available
SELECT out_title, out_category_name, out_available_copies FROM fn_search_books('database', NULL);

\echo '==== 2. SUBMIT REQUESTS (no copy deducted yet) ===='
CALL sp_submit_borrow_request(2, 3, NULL);   -- Juan  asks for book 3
CALL sp_submit_borrow_request(3, 3, NULL);   -- Maria asks for the SAME last copy
CALL sp_submit_borrow_request(2, 3, NULL);   -- (EXPECT ERROR) duplicate request
SELECT out_borrow_id, out_student_name, out_title, out_available_copies FROM fn_get_pending_requests();

\echo '==== 3. APPROVAL WORKFLOW ===='
CALL sp_decide_borrow_request(1, 2, 'approve', 'self', 7);   -- (EXPECT ERROR) a student cannot approve
CALL sp_decide_borrow_request(1, 1, 'approve', 'Approved', 7);   -- admin approves Juan -> copy deducted
SELECT book_id, available_copies FROM books WHERE book_id = 3;   -- now 0
CALL sp_decide_borrow_request(1, 1, 'approve', 'again', 7);      -- (EXPECT ERROR) already decided

\echo '---- TRANSACTION ROLLBACK DEMO: last copy is gone, approving Maria must fail'
CALL sp_decide_borrow_request(2, 1, 'approve', 'try', 7);        -- (EXPECT ERROR) rolled back
SELECT borrow_id, status FROM borrow_transactions ORDER BY borrow_id;  -- Maria still pending
SELECT log_level, message, context FROM system_logs;             -- failure kept in the log
CALL sp_decide_borrow_request(2, 1, 'reject', 'No copy left', 7);  -- reject instead

\echo '==== 4. ISSUE, OVERDUE, RETURN, FINE ===='
CALL sp_issue_book(1, 1);
UPDATE borrow_transactions SET due_date = CURRENT_DATE - 3 WHERE borrow_id = 1;  -- simulate lateness
CALL sp_mark_overdue_borrowings(NULL);                           -- batch procedure
CALL sp_request_return(1, 3);                                    -- (EXPECT ERROR) not the owner
CALL sp_request_return(1, 2);                                    -- Juan requests return
CALL sp_confirm_return(1, 2, NULL);                              -- (EXPECT ERROR) student cannot confirm
CALL sp_confirm_return(1, 1, NULL);                              -- admin confirms -> fine 30.00
SELECT status, due_date, fine_amount FROM borrow_transactions WHERE borrow_id = 1;
SELECT book_id, available_copies FROM books WHERE book_id = 3;   -- restored to 1
UPDATE borrow_transactions SET status = 'borrowed' WHERE borrow_id = 1;   -- (EXPECT ERROR) illegal transition

\echo '==== 5. OTHER TRIGGER GUARDS ===='
DELETE FROM books WHERE book_id = 1;                             -- (EXPECT ERROR) hard delete blocked
UPDATE books SET total_copies = 5 WHERE book_id = 1;             -- available follows: 3 -> 5
SELECT total_copies, available_copies FROM books WHERE book_id = 1;
UPDATE books SET total_copies = 0 WHERE book_id = 1;             -- fine (nothing on loan) -> available 0
UPDATE books SET total_copies = 3, available_copies = 3 WHERE book_id = 1;  -- restore (explicit)

\echo '==== 6. E-LIBRARY SESSIONS ===='
CALL sp_start_elibrary_session(2, 1, 'Research', NULL);
SELECT unit_code, status FROM elibrary_units WHERE unit_id = 1;  -- in_use (trigger)
CALL sp_start_elibrary_session(3, 1, 'Study', NULL);             -- (EXPECT ERROR) unit taken
CALL sp_start_elibrary_session(2, 2, 'Study', NULL);             -- (EXPECT ERROR) student already active
CALL sp_end_elibrary_session(1, 3);                              -- (EXPECT ERROR) not owner
CALL sp_end_elibrary_session(1, 2);
SELECT unit_code, status FROM elibrary_units WHERE unit_id = 1;  -- available again

\echo '==== 7. DAMAGE REPORT ===='
CALL sp_submit_damage_report(2, NULL, 1, 'Cracked screen', 'Monitor has a crack', 'moderate', NULL);
CALL sp_resolve_damage_report(1, 2, 'resolved', 'x');            -- (EXPECT ERROR) not admin
CALL sp_resolve_damage_report(1, 1, 'resolved', 'Sent for repair', 'repair_needed');
SELECT condition FROM peripherals WHERE peripheral_id = 1;

\echo '==== 8. NOTIFICATIONS (created by triggers) ===='
SELECT user_id, type, title FROM notifications ORDER BY notification_id;

\echo '==== 9. AUDIT TRAIL ===='
SELECT audit_id, table_name, record_id, operation, app_user_id, changed_by_user
FROM   vw_audit_trail WHERE table_name = 'borrow_transactions' ORDER BY audit_id LIMIT 12;
SELECT COUNT(*) AS audit_rows_leaking_password_hash
FROM   audit_logs WHERE old_data ? 'password_hash' OR new_data ? 'password_hash';

\echo '==== 10. VIEWS AND DASHBOARD ===='
SELECT * FROM vw_inventory_check;                                -- consistent must be all TRUE
SELECT jsonb_pretty(fn_get_dashboard_stats());

\echo '==== 11. LECTURE RULE: COMMIT inside an explicit transaction ===='
BEGIN;
CALL sp_submit_borrow_request(4, 1, NULL);                       -- (EXPECT ERROR) invalid transaction termination
ROLLBACK;
