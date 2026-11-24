-- =====================================================================
-- ULITMS | File: 07_security.sql   (STEP 2E: application role + grants)
-- Lecture slides 90-91: SECURITY DEFINER vs INVOKER, GRANT/REVOKE EXECUTE.
-- The API connects as app_user. app_user can:
--   * EXECUTE the functions / procedures
--   * SELECT the views and the non-sensitive tables
--   * INSERT/UPDATE operational tables (never DELETE - also blocked by trigger)
-- app_user CANNOT: read password_hash, read/write audit_logs directly,
-- or read system_logs. Audit rows are written only by trg_fn_audit_row.
-- CHANGE THE PASSWORD before real use.
-- =====================================================================
SET search_path TO library, public;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'ulitms_app_2026';
    END IF;
END
$$;

ALTER ROLE app_user SET search_path = library, public;

GRANT USAGE ON SCHEMA library TO app_user;

-- routines: revoke the default PUBLIC execute, then grant explicitly
REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA library FROM PUBLIC;
GRANT  EXECUTE ON ALL ROUTINES IN SCHEMA library TO app_user;

-- views
GRANT SELECT ON vw_active_catalog, vw_pending_borrow_requests, vw_active_borrowings,
                vw_elibrary_unit_status, vw_user_activity, vw_open_damage_reports,
                vw_audit_trail, vw_inventory_check TO app_user;

-- tables: read
GRANT SELECT ON book_categories, books, borrow_transactions, elibrary_units,
                elibrary_sessions, peripheral_categories, peripherals,
                damage_reports, notifications TO app_user;

-- users: column-level read (password_hash deliberately excluded)
GRANT SELECT (user_id, student_number, first_name, last_name, email, role,
              contact_number, course, year_level, status, preferences,
              created_at, updated_at, deleted_at)
      ON users TO app_user;

-- tables: write (no DELETE anywhere)
GRANT INSERT, UPDATE ON users, book_categories, books, borrow_transactions,
                        elibrary_units, elibrary_sessions, peripheral_categories,
                        peripherals, damage_reports, notifications TO app_user;
GRANT INSERT ON system_logs TO app_user;
