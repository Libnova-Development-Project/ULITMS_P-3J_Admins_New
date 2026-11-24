-- =====================================================================
-- ULITMS | File: 04_procedures.sql   (STEP 2B: stored procedures)
-- Pattern copied from the lecture's enroll_student_course():
--   validate -> RAISE EXCEPTION on failure -> write -> COMMIT.
-- IMPORTANT (lecture slide 56): procedures that COMMIT must be CALLed
-- in auto-commit mode, i.e. NOT inside BEGIN ... END from the client.
-- COMMIT is never placed inside a BEGIN...EXCEPTION block (PostgreSQL
-- does not allow it), so catch-blocks wrap only the single INSERT.
--
-- Every procedure that has an acting user runs
--   PERFORM set_config('app.current_user_id', ..., true)
-- so the audit trigger records WHO did it (audit_logs.app_user_id).
-- =====================================================================
SET search_path TO library, public;

-- ---------------------------------------------------------------------
-- P1. sp_register_user
--     API: POST /api/auth/register   (password already hashed by API)
--     CALL sp_register_user('2026-0010','Ana','Reyes','ana@ulitms.edu',
--                           '<bcrypt>','student','BSIS',2,NULL);
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_register_user(
    p_student_number VARCHAR,
    p_first_name     VARCHAR,
    p_last_name      VARCHAR,
    p_email          VARCHAR,
    p_password_hash  VARCHAR,
    p_role           VARCHAR,
    p_course         VARCHAR,
    p_year_level     INT,
    INOUT p_user_id  INT
)
LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        INSERT INTO users (student_number, first_name, last_name, email,
                           password_hash, role, course, year_level)
        VALUES (p_student_number, p_first_name, p_last_name, p_email,
                p_password_hash, p_role, p_course, p_year_level)
        RETURNING user_id INTO p_user_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'Email or student number is already registered';
    END;
    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P2. sp_submit_borrow_request
--     Student asks to borrow. NO copy is deducted here - the request just
--     enters the admin queue as pending_approval.
--     (the notification to admins is made by trigger trg_borrow_notify_insert)
--     API: POST /api/borrowings
--     CALL sp_submit_borrow_request(2, 1, NULL);
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_submit_borrow_request(
    p_user_id          INT,
    p_book_id          INT,
    INOUT p_borrow_id  INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_can_borrow BOOLEAN;
    v_reason     TEXT;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, true);

    SELECT can_borrow, reason INTO v_can_borrow, v_reason
    FROM fn_check_borrow_eligibility(p_user_id, p_book_id);

    IF NOT v_can_borrow THEN
        RAISE EXCEPTION 'Request denied: %', v_reason;
    END IF;

    INSERT INTO borrow_transactions (user_id, book_id)
    VALUES (p_user_id, p_book_id)
    RETURNING borrow_id INTO p_borrow_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P3. sp_decide_borrow_request   *** the approval workflow ***
--     Admin approves or rejects. On approve, in ONE transaction:
--       lock request + lock book -> recheck copies -> deduct 1 copy ->
--       status approved + approver + due date.
--     If the last copy was taken meanwhile: ROLLBACK, write the failure to
--     system_logs, COMMIT the log, then raise the error to the API.
--     API: PUT /api/borrowings/:id/decision
--     CALL sp_decide_borrow_request(1, 1, 'approve', 'OK', 7);
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_decide_borrow_request(
    p_borrow_id  INT,
    p_admin_id   INT,
    p_decision   VARCHAR,            -- 'approve' | 'reject'
    p_note       TEXT DEFAULT NULL,
    p_loan_days  INT  DEFAULT 7
)
LANGUAGE plpgsql AS $$
DECLARE
    v_req    borrow_transactions%ROWTYPE;
    v_copies INT;
BEGIN
    PERFORM set_config('app.current_user_id', p_admin_id::text, true);

    IF NOT EXISTS (SELECT 1 FROM users
                   WHERE user_id = p_admin_id AND role = 'admin'
                     AND status = 'active' AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Only an active administrator can decide requests';
    END IF;

    IF p_decision NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Decision must be approve or reject, got %', p_decision;
    END IF;

    -- row lock: two admins cannot decide the same request at once
    SELECT * INTO v_req FROM borrow_transactions
    WHERE borrow_id = p_borrow_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Borrow request % not found', p_borrow_id;
    ELSIF v_req.status <> 'pending_approval' THEN
        RAISE EXCEPTION 'Request % was already decided (status: %)', p_borrow_id, v_req.status;
    ELSIF v_req.user_id = p_admin_id THEN
        RAISE EXCEPTION 'An administrator cannot decide their own request';
    END IF;

    IF p_decision = 'reject' THEN
        UPDATE borrow_transactions
        SET    status = 'rejected', reviewed_by = p_admin_id,
               reviewed_at = CURRENT_TIMESTAMP, decision_note = p_note
        WHERE  borrow_id = p_borrow_id;
        COMMIT;
        RETURN;
    END IF;

    IF p_loan_days NOT BETWEEN 1 AND 30 THEN
        RAISE EXCEPTION 'Loan period must be 1 to 30 days';
    END IF;

    -- lock the book row, then RECHECK inventory (availability at request
    -- time is not a guarantee at approval time)
    SELECT available_copies INTO v_copies FROM books
    WHERE book_id = v_req.book_id AND status = 'active' AND deleted_at IS NULL
    FOR UPDATE;

    IF v_copies IS NULL OR v_copies <= 0 THEN
        ROLLBACK;                                   -- undo everything above
        INSERT INTO system_logs (log_level, message, context)
        VALUES ('WARNING', 'Approval failed: no copy available',
                jsonb_build_object('borrow_id', p_borrow_id,
                                   'book_id',   v_req.book_id,
                                   'admin_id',  p_admin_id));
        COMMIT;                                     -- keep only the log row
        RAISE EXCEPTION 'No copy available for book %. Request stays pending', v_req.book_id;
    END IF;

    UPDATE books SET available_copies = available_copies - 1
    WHERE  book_id = v_req.book_id;

    UPDATE borrow_transactions
    SET    status = 'approved', reviewed_by = p_admin_id,
           reviewed_at = CURRENT_TIMESTAMP, approved_at = CURRENT_TIMESTAMP,
           decision_note = p_note,
           due_date = CURRENT_DATE + p_loan_days
    WHERE  borrow_id = p_borrow_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P4. sp_issue_book  | physical hand-over at the counter: approved -> borrowed
--     API: PUT /api/borrowings/:id/issue
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_issue_book(
    p_borrow_id INT,
    p_admin_id  INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    PERFORM set_config('app.current_user_id', p_admin_id::text, true);

    IF NOT EXISTS (SELECT 1 FROM users
                   WHERE user_id = p_admin_id AND role = 'admin' AND status = 'active') THEN
        RAISE EXCEPTION 'Only an active administrator can issue books';
    END IF;

    SELECT status INTO v_status FROM borrow_transactions
    WHERE borrow_id = p_borrow_id FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Borrow record % not found', p_borrow_id;
    ELSIF v_status <> 'approved' THEN
        RAISE EXCEPTION 'Only approved requests can be issued (status: %)', v_status;
    END IF;

    UPDATE borrow_transactions
    SET    status = 'borrowed', borrowed_at = CURRENT_TIMESTAMP
    WHERE  borrow_id = p_borrow_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P5. sp_request_return | student starts the return (nothing is restored yet)
--     API: PUT /api/borrowings/:id/return-request
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_request_return(
    p_borrow_id INT,
    p_user_id   INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_owner  INT;
    v_status VARCHAR;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, true);

    SELECT user_id, status INTO v_owner, v_status
    FROM borrow_transactions WHERE borrow_id = p_borrow_id FOR UPDATE;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'Borrow record % not found', p_borrow_id;
    ELSIF v_owner <> p_user_id THEN
        RAISE EXCEPTION 'You can only return your own borrowed books';
    ELSIF v_status NOT IN ('borrowed', 'overdue') THEN
        RAISE EXCEPTION 'Only borrowed books can be returned (status: %)', v_status;
    END IF;

    UPDATE borrow_transactions
    SET    status = 'pending_return', return_requested_at = CURRENT_TIMESTAMP
    WHERE  borrow_id = p_borrow_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P6. sp_confirm_return | admin received the physical book.
--     One transaction: compute fine -> mark returned -> restore 1 copy.
--     INOUT p_fine sends the fine back to the API.
--     API: PUT /api/borrowings/:id/confirm-return
--     CALL sp_confirm_return(1, 1, NULL);
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_confirm_return(
    p_borrow_id INT,
    p_admin_id  INT,
    INOUT p_fine NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
    v_req borrow_transactions%ROWTYPE;
BEGIN
    PERFORM set_config('app.current_user_id', p_admin_id::text, true);

    IF NOT EXISTS (SELECT 1 FROM users
                   WHERE user_id = p_admin_id AND role = 'admin' AND status = 'active') THEN
        RAISE EXCEPTION 'Only an active administrator can confirm returns';
    END IF;

    SELECT * INTO v_req FROM borrow_transactions
    WHERE borrow_id = p_borrow_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Borrow record % not found', p_borrow_id;
    ELSIF v_req.status <> 'pending_return' THEN
        RAISE EXCEPTION 'Only pending returns can be confirmed (status: %)', v_req.status;
    END IF;

    p_fine := fn_calculate_fine(v_req.due_date, CURRENT_DATE);

    UPDATE borrow_transactions
    SET    status = 'returned', returned_at = CURRENT_TIMESTAMP,
           confirmed_by = p_admin_id, fine_amount = p_fine
    WHERE  borrow_id = p_borrow_id;

    UPDATE books SET available_copies = available_copies + 1
    WHERE  book_id = v_req.book_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P7. sp_mark_overdue_borrowings | bulk batch (lecture: Bulk Status Batch)
--     Run daily by the API (or manually). Students are notified by trigger.
--     CALL sp_mark_overdue_borrowings(NULL);
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_mark_overdue_borrowings(
    INOUT p_updated INT
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE borrow_transactions
    SET    status = 'overdue'
    WHERE  status = 'borrowed' AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS p_updated = ROW_COUNT;

    INSERT INTO system_logs (log_level, message, context)
    VALUES ('INFO', 'Overdue batch executed',
            jsonb_build_object('marked_overdue', p_updated));

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P8. sp_start_elibrary_session
--     The unique indexes make double-booking impossible even when two
--     students click at the same instant; the catch block turns that
--     database error into a readable message.
--     (unit status -> in_use is done by trigger trg_session_sync_unit)
--     API: POST /api/elibrary/sessions
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_start_elibrary_session(
    p_user_id          INT,
    p_unit_id          INT,
    p_purpose          VARCHAR,
    INOUT p_session_id INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_unit_status VARCHAR;
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::text, true);

    IF NOT EXISTS (SELECT 1 FROM users
                   WHERE user_id = p_user_id AND status = 'active' AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'User account is not active';
    END IF;

    SELECT status INTO v_unit_status FROM elibrary_units
    WHERE unit_id = p_unit_id AND deleted_at IS NULL;

    IF v_unit_status IS NULL THEN
        RAISE EXCEPTION 'Computer unit % not found', p_unit_id;
    ELSIF v_unit_status <> 'available' THEN
        RAISE EXCEPTION 'Computer unit is not available (status: %)', v_unit_status;
    END IF;

    BEGIN
        INSERT INTO elibrary_sessions (user_id, unit_id, purpose)
        VALUES (p_user_id, p_unit_id, p_purpose)
        RETURNING session_id INTO p_session_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'This unit is taken, or you already have an active session';
    END;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P9. sp_end_elibrary_session | owner or admin may end it
--     API: PUT /api/elibrary/sessions/:id/end
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_end_elibrary_session(
    p_session_id INT,
    p_actor_id   INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_owner INT;
BEGIN
    PERFORM set_config('app.current_user_id', p_actor_id::text, true);

    SELECT user_id INTO v_owner FROM elibrary_sessions
    WHERE session_id = p_session_id AND time_out IS NULL FOR UPDATE;

    IF v_owner IS NULL THEN
        RAISE EXCEPTION 'No active session with id %', p_session_id;
    ELSIF v_owner <> p_actor_id AND NOT EXISTS
          (SELECT 1 FROM users WHERE user_id = p_actor_id AND role = 'admin') THEN
        RAISE EXCEPTION 'You can only end your own session';
    END IF;

    UPDATE elibrary_sessions SET time_out = CURRENT_TIMESTAMP
    WHERE  session_id = p_session_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P10. sp_submit_damage_report
--      API: POST /api/damage-reports
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_submit_damage_report(
    p_reported_by   INT,
    p_unit_id       INT,
    p_peripheral_id INT,
    p_damage_type   VARCHAR,
    p_description   TEXT,
    p_severity      VARCHAR,
    INOUT p_report_id INT
)
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_reported_by::text, true);

    IF p_unit_id IS NULL AND p_peripheral_id IS NULL THEN
        RAISE EXCEPTION 'Select the computer unit or peripheral that is damaged';
    END IF;

    INSERT INTO damage_reports (reported_by, unit_id, peripheral_id,
                                damage_type, description, severity)
    VALUES (p_reported_by, p_unit_id, p_peripheral_id,
            p_damage_type, p_description, COALESCE(p_severity, 'minor'))
    RETURNING report_id INTO p_report_id;

    COMMIT;
END;
$$;

-- ---------------------------------------------------------------------
-- P11. sp_resolve_damage_report | admin closes a report and (optionally)
--      updates the peripheral condition in the same transaction.
--      API: PUT /api/damage-reports/:id/resolve
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_resolve_damage_report(
    p_report_id     INT,
    p_admin_id      INT,
    p_status        VARCHAR,          -- 'resolved' | 'closed'
    p_notes         TEXT,
    p_new_condition VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_peripheral INT;
    v_status     VARCHAR;
BEGIN
    PERFORM set_config('app.current_user_id', p_admin_id::text, true);

    IF NOT EXISTS (SELECT 1 FROM users
                   WHERE user_id = p_admin_id AND role = 'admin' AND status = 'active') THEN
        RAISE EXCEPTION 'Only an active administrator can resolve reports';
    END IF;

    IF p_status NOT IN ('resolved', 'closed') THEN
        RAISE EXCEPTION 'Status must be resolved or closed';
    END IF;

    SELECT peripheral_id, status INTO v_peripheral, v_status
    FROM damage_reports WHERE report_id = p_report_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Damage report % not found', p_report_id;
    ELSIF v_status IN ('resolved', 'closed') THEN
        RAISE EXCEPTION 'Report % is already %', p_report_id, v_status;
    END IF;

    UPDATE damage_reports
    SET    status = p_status, resolved_by = p_admin_id,
           resolved_at = CURRENT_TIMESTAMP, resolution_notes = p_notes
    WHERE  report_id = p_report_id;

    IF p_new_condition IS NOT NULL AND v_peripheral IS NOT NULL THEN
        UPDATE peripherals SET condition = p_new_condition
        WHERE  peripheral_id = v_peripheral;
    END IF;

    COMMIT;
END;
$$;
