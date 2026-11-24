-- =====================================================================
-- ULITMS | File: 05_triggers.sql   (STEP 2C: triggers)
-- Two-step architecture from the lecture:
--   Step 1 = trigger FUNCTION (no parameters, RETURNS TRIGGER)
--   Step 2 = CREATE TRIGGER binding (table + timing + event)
-- Naming: trigger functions  trg_fn_*   |   triggers  trg_*
--
--  #  Trigger function                  Timing/Event          Purpose
--  1  trg_fn_set_updated_at             BEFORE UPDATE         auto-maintain updated_at (8 tables)
--  2  trg_fn_sanitize_user              BEFORE INSERT/UPDATE  trim/lowercase user input
--  3  trg_fn_prevent_hard_delete        BEFORE DELETE         force soft delete (4 tables)
--  4  trg_fn_guard_book_deactivation    BEFORE UPDATE         no deactivating a book that is on loan
--  5  trg_fn_adjust_available_copies    BEFORE UPDATE         keep available in step with total
--  6  trg_fn_validate_borrow_transition BEFORE UPDATE         legal status changes only
--  7  trg_fn_sync_unit_status           AFTER INSERT/UPDATE   session start/end -> unit status
--  8  trg_fn_notify_borrow              AFTER INSERT/UPDATE   notifications for the borrow workflow
--  9  trg_fn_notify_damage              AFTER INSERT/UPDATE   notifications for damage reports
-- 10  trg_fn_audit_row                  AFTER INS/UPD/DEL     universal audit trail (9 tables)
-- =====================================================================
SET search_path TO library, public;

-- ---------------------------------------------------------------------
-- 1. Timestamp maintenance (lecture: set_student_updated_timestamp)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users                FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_books_updated_at        BEFORE UPDATE ON books                FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_book_cat_updated_at     BEFORE UPDATE ON book_categories      FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_borrow_updated_at       BEFORE UPDATE ON borrow_transactions  FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_units_updated_at        BEFORE UPDATE ON elibrary_units       FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_periph_cat_updated_at   BEFORE UPDATE ON peripheral_categories FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_peripherals_updated_at  BEFORE UPDATE ON peripherals          FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();
CREATE TRIGGER trg_damage_updated_at       BEFORE UPDATE ON damage_reports       FOR EACH ROW EXECUTE FUNCTION trg_fn_set_updated_at();

-- ---------------------------------------------------------------------
-- 2. BEFORE INSERT/UPDATE: data sanitization (lecture: sanitize_student_input)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_sanitize_user()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.email      := LOWER(TRIM(NEW.email));
    NEW.first_name := TRIM(NEW.first_name);
    NEW.last_name  := TRIM(NEW.last_name);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_sanitize
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_fn_sanitize_user();

-- ---------------------------------------------------------------------
-- 3. BEFORE DELETE: preventing record loss (lecture slide 73).
--    Rows are never physically deleted; the API soft-deletes by setting
--    deleted_at, which keeps borrowing history and the audit trail valid.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_prevent_hard_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Physical delete on % is not allowed. Soft delete instead: SET deleted_at = CURRENT_TIMESTAMP', TG_TABLE_NAME;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_users_no_delete    BEFORE DELETE ON users               FOR EACH ROW EXECUTE FUNCTION trg_fn_prevent_hard_delete();
CREATE TRIGGER trg_books_no_delete    BEFORE DELETE ON books               FOR EACH ROW EXECUTE FUNCTION trg_fn_prevent_hard_delete();
CREATE TRIGGER trg_borrow_no_delete   BEFORE DELETE ON borrow_transactions FOR EACH ROW EXECUTE FUNCTION trg_fn_prevent_hard_delete();
CREATE TRIGGER trg_damage_no_delete   BEFORE DELETE ON damage_reports      FOR EACH ROW EXECUTE FUNCTION trg_fn_prevent_hard_delete();

-- ---------------------------------------------------------------------
-- 4. BEFORE UPDATE + WHEN: guard a critical change (lecture slides 72, 78).
--    A book cannot be soft-deleted or set inactive while copies are out.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_guard_book_deactivation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_out INT;
BEGIN
    SELECT COUNT(*) INTO v_out FROM borrow_transactions
    WHERE book_id = NEW.book_id
      AND status IN ('approved', 'borrowed', 'pending_return', 'overdue');

    IF v_out > 0 THEN
        RAISE EXCEPTION 'Cannot deactivate book %: % cop(ies) are still allocated to loans',
                        NEW.book_id, v_out;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_books_guard_deactivation
BEFORE UPDATE ON books
FOR EACH ROW
WHEN ((OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
   OR (OLD.status = 'active' AND NEW.status = 'inactive'))
EXECUTE FUNCTION trg_fn_guard_book_deactivation();

-- ---------------------------------------------------------------------
-- 5. BEFORE UPDATE: when an admin changes total_copies (adds/removes
--    copies), available_copies moves by the same amount automatically.
--    Procedures change available_copies only, so they do not fire this.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_adjust_available_copies()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.available_copies := OLD.available_copies + (NEW.total_copies - OLD.total_copies);

    IF NEW.available_copies < 0 THEN
        RAISE EXCEPTION 'Cannot reduce total copies to %: % copies are currently on loan',
                        NEW.total_copies, OLD.total_copies - OLD.available_copies;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_books_adjust_available
BEFORE UPDATE ON books
FOR EACH ROW
WHEN (OLD.total_copies IS DISTINCT FROM NEW.total_copies
  AND OLD.available_copies = NEW.available_copies)
EXECUTE FUNCTION trg_fn_adjust_available_copies();

-- ---------------------------------------------------------------------
-- 6. BEFORE UPDATE: the borrowing status can only follow legal steps
--    (the lifecycle in ULITMS Appendix B). Protects the data even if a
--    developer writes a wrong UPDATE.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_validate_borrow_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (OLD.status, NEW.status) NOT IN (
        ('pending_approval', 'approved'),
        ('pending_approval', 'rejected'),
        ('approved',         'borrowed'),
        ('borrowed',         'pending_return'),
        ('borrowed',         'overdue'),
        ('borrowed',         'lost'),
        ('overdue',          'pending_return'),
        ('overdue',          'lost'),
        ('pending_return',   'returned'),
        ('pending_return',   'lost')
    ) THEN
        RAISE EXCEPTION 'Invalid borrowing status change: % -> %', OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_borrow_validate_transition
BEFORE UPDATE ON borrow_transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trg_fn_validate_borrow_transition();

-- ---------------------------------------------------------------------
-- 7. AFTER INSERT / AFTER UPDATE: cascade effect on another table.
--    Session starts -> unit becomes in_use. Session ends -> available.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_sync_unit_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE elibrary_units SET status = 'in_use'
        WHERE  unit_id = NEW.unit_id AND status = 'available';
    ELSE
        UPDATE elibrary_units SET status = 'available'
        WHERE  unit_id = NEW.unit_id AND status = 'in_use';
    END IF;
    RETURN NULL;   -- AFTER trigger: return value ignored
END;
$$;

CREATE TRIGGER trg_session_sync_unit_start
AFTER INSERT ON elibrary_sessions
FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_unit_status();

CREATE TRIGGER trg_session_sync_unit_end
AFTER UPDATE ON elibrary_sessions
FOR EACH ROW
WHEN (OLD.time_out IS NULL AND NEW.time_out IS NOT NULL)
EXECUTE FUNCTION trg_fn_sync_unit_status();

-- ---------------------------------------------------------------------
-- 8. AFTER INSERT / AFTER UPDATE: borrowing notifications.
--    TG_OP tells the function which event fired it (lecture: TG_OP).
--    SECURITY DEFINER so the app role needs no direct INSERT right here.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_notify_borrow()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = library, pg_temp
AS $$
DECLARE
    v_title VARCHAR;
    v_name  TEXT;
BEGIN
    SELECT title INTO v_title FROM books WHERE book_id = NEW.book_id;
    SELECT first_name || ' ' || last_name INTO v_name FROM users WHERE user_id = NEW.user_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        SELECT user_id, 'borrow_request', 'New borrowing request',
               format('%s requested "%s". Review it in the pending queue.', v_name, v_title),
               jsonb_build_object('borrow_id', NEW.borrow_id)
        FROM   users
        WHERE  role = 'admin' AND status = 'active' AND deleted_at IS NULL
          AND  user_id <> NEW.user_id;
        RETURN NULL;
    END IF;

    IF NEW.status = 'approved' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        VALUES (NEW.user_id, 'borrow_approved', 'Borrowing request approved',
                format('Your request for "%s" was approved. Due date: %s. Please proceed to the library counter.',
                       v_title, NEW.due_date),
                jsonb_build_object('borrow_id', NEW.borrow_id));

    ELSIF NEW.status = 'rejected' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        VALUES (NEW.user_id, 'borrow_rejected', 'Borrowing request rejected',
                format('Your request for "%s" was rejected. Reason: %s',
                       v_title, COALESCE(NEW.decision_note, 'none given')),
                jsonb_build_object('borrow_id', NEW.borrow_id));

    ELSIF NEW.status = 'pending_return' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        SELECT user_id, 'return_request', 'Return request received',
               format('%s wants to return "%s". Confirm after checking the book.', v_name, v_title),
               jsonb_build_object('borrow_id', NEW.borrow_id)
        FROM   users
        WHERE  role = 'admin' AND status = 'active' AND deleted_at IS NULL;

    ELSIF NEW.status = 'returned' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        VALUES (NEW.user_id, 'return_confirmed', 'Return confirmed',
                format('Your return of "%s" was confirmed. Fine: PHP %s.', v_title, NEW.fine_amount),
                jsonb_build_object('borrow_id', NEW.borrow_id));

    ELSIF NEW.status = 'overdue' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        VALUES (NEW.user_id, 'overdue', 'Book overdue',
                format('"%s" was due on %s. Please return it; PHP 10.00 is charged per day.',
                       v_title, NEW.due_date),
                jsonb_build_object('borrow_id', NEW.borrow_id));
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_borrow_notify_insert
AFTER INSERT ON borrow_transactions
FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_borrow();

CREATE TRIGGER trg_borrow_notify_status
AFTER UPDATE ON borrow_transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trg_fn_notify_borrow();

-- ---------------------------------------------------------------------
-- 9. AFTER INSERT / AFTER UPDATE: damage-report notifications
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_notify_damage()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = library, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (user_id, type, title, message, reference)
        SELECT user_id, 'damage_report', 'New damage report',
               format('A %s damage report (%s) was submitted.', NEW.severity, NEW.damage_type),
               jsonb_build_object('report_id', NEW.report_id)
        FROM   users
        WHERE  role = 'admin' AND status = 'active' AND deleted_at IS NULL;
    ELSE
        INSERT INTO notifications (user_id, type, title, message, reference)
        VALUES (NEW.reported_by, 'damage_update', 'Damage report ' || NEW.status,
                format('Your damage report #%s is now %s. %s', NEW.report_id, NEW.status,
                       COALESCE(NEW.resolution_notes, '')),
                jsonb_build_object('report_id', NEW.report_id));
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_damage_notify_insert
AFTER INSERT ON damage_reports
FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_damage();

CREATE TRIGGER trg_damage_notify_status
AFTER UPDATE ON damage_reports
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('resolved', 'closed'))
EXECUTE FUNCTION trg_fn_notify_damage();

-- ---------------------------------------------------------------------
-- 10. UNIVERSAL AUDIT TRIGGER (lecture slide 88, upgraded)
--     One function audits every table. The primary-key column name is
--     passed as a trigger argument (TG_ARGV[0]). Snapshots use
--     to_jsonb(OLD)/to_jsonb(NEW); password_hash is removed so secrets
--     never reach the log. WHO did it = app.current_user_id, set by the
--     procedures (or by the API for plain updates).
--     SECURITY DEFINER: the audit table is writable only through this
--     function, so users cannot forge or erase audit rows.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fn_audit_row()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = library, pg_temp
AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN v_old := to_jsonb(OLD) - 'password_hash'; END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN v_new := to_jsonb(NEW) - 'password_hash'; END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data,
                            changed_by, app_user_id)
    VALUES (TG_TABLE_NAME,
            (COALESCE(v_new, v_old) ->> TG_ARGV[0])::INT,
            TG_OP, v_old, v_new,
            SESSION_USER,
            NULLIF(current_setting('app.current_user_id', TRUE), '')::INT);

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_users       AFTER INSERT OR UPDATE OR DELETE ON users                 FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('user_id');
CREATE TRIGGER trg_audit_book_cat    AFTER INSERT OR UPDATE OR DELETE ON book_categories       FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('category_id');
CREATE TRIGGER trg_audit_books       AFTER INSERT OR UPDATE OR DELETE ON books                 FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('book_id');
CREATE TRIGGER trg_audit_borrow      AFTER INSERT OR UPDATE OR DELETE ON borrow_transactions   FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('borrow_id');
CREATE TRIGGER trg_audit_units       AFTER INSERT OR UPDATE OR DELETE ON elibrary_units        FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('unit_id');
CREATE TRIGGER trg_audit_sessions    AFTER INSERT OR UPDATE OR DELETE ON elibrary_sessions     FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('session_id');
CREATE TRIGGER trg_audit_periph_cat  AFTER INSERT OR UPDATE OR DELETE ON peripheral_categories FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('category_id');
CREATE TRIGGER trg_audit_peripherals AFTER INSERT OR UPDATE OR DELETE ON peripherals           FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('peripheral_id');
CREATE TRIGGER trg_audit_damage      AFTER INSERT OR UPDATE OR DELETE ON damage_reports        FOR EACH ROW EXECUTE FUNCTION trg_fn_audit_row('report_id');
