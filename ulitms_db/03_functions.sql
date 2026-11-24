-- =====================================================================
-- ULITMS | File: 03_functions.sql   (STEP 2A: user-defined functions)
-- Run AFTER 01_schema.sql and 02_seed.sql.
-- Functions are called with SELECT and never COMMIT/ROLLBACK (lecture rule).
-- =====================================================================
SET search_path TO library, public;

-- ---------------------------------------------------------------------
-- F1. fn_calculate_fine  | Pure SQL scalar function (IMMUTABLE)
--     Overdue fine = PHP 10.00 per day late (policy from the ULITMS doc).
--     Used by: sp_confirm_return, vw_active_borrowings
--     SELECT fn_calculate_fine(CURRENT_DATE - 3, CURRENT_DATE);  -> 30.00
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_fine(
    p_due_date    DATE,
    p_return_date DATE
)
RETURNS NUMERIC
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT GREATEST(p_return_date - p_due_date, 0) * 10.00;
$$;

-- ---------------------------------------------------------------------
-- F2. fn_is_book_available | Boolean check function using EXISTS
--     Used by: fn_check_borrow_eligibility
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_is_book_available(p_book_id INT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM books
        WHERE book_id = p_book_id
          AND status = 'active'
          AND deleted_at IS NULL
          AND available_copies > 0
    );
$$;

-- ---------------------------------------------------------------------
-- F3. fn_check_borrow_eligibility | PL/pgSQL with OUT parameters
--     Validates every rule before a request may be submitted.
--     Used by: sp_submit_borrow_request
--     SELECT * FROM fn_check_borrow_eligibility(2, 1);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_borrow_eligibility(
    p_user_id     INT,
    p_book_id     INT,
    OUT can_borrow BOOLEAN,
    OUT reason     TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_status      VARCHAR;
    v_open_loans  INT;
    v_overdue     INT;
BEGIN
    can_borrow := FALSE;

    SELECT status INTO v_status
    FROM users WHERE user_id = p_user_id AND deleted_at IS NULL;

    IF v_status IS NULL THEN
        reason := 'User account not found';
        RETURN;
    ELSIF v_status <> 'active' THEN
        reason := 'User account is ' || v_status;
        RETURN;
    END IF;

    IF NOT fn_is_book_available(p_book_id) THEN
        reason := 'Book is not available for borrowing';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM borrow_transactions
               WHERE user_id = p_user_id AND book_id = p_book_id
                 AND status IN ('pending_approval', 'approved', 'borrowed',
                                'pending_return', 'overdue')) THEN
        reason := 'You already have an open request or loan for this book';
        RETURN;
    END IF;

    SELECT COUNT(*) FILTER (WHERE status = 'overdue'),
           COUNT(*)
    INTO   v_overdue, v_open_loans
    FROM   borrow_transactions
    WHERE  user_id = p_user_id
      AND  status IN ('pending_approval', 'approved', 'borrowed',
                      'pending_return', 'overdue');

    IF v_overdue > 0 THEN
        reason := 'You have an overdue book. Return it first';
        RETURN;
    ELSIF v_open_loans >= 3 THEN
        reason := 'Borrowing limit reached (maximum 3 open requests/loans)';
        RETURN;
    END IF;

    can_borrow := TRUE;
    reason := 'Eligible';
END;
$$;

-- ---------------------------------------------------------------------
-- F4. fn_search_books | Multi-criteria search returning a table
--     API: GET /api/books?keyword=&category_id=
--     SELECT * FROM fn_search_books('database', NULL);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_books(
    p_keyword     TEXT DEFAULT NULL,
    p_category_id INT  DEFAULT NULL
)
RETURNS TABLE (
    out_book_id          INT,
    out_isbn             VARCHAR,
    out_title            VARCHAR,
    out_author           VARCHAR,
    out_category_name    VARCHAR,
    out_available_copies INT,
    out_total_copies     INT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT b.book_id, b.isbn, b.title, b.author, c.category_name,
           b.available_copies, b.total_copies
    FROM   books b
    LEFT JOIN book_categories c ON c.category_id = b.category_id
    WHERE  b.status = 'active'
      AND  b.deleted_at IS NULL
      AND  (p_category_id IS NULL OR b.category_id = p_category_id)
      AND  (p_keyword IS NULL
            OR b.title  ILIKE '%' || p_keyword || '%'
            OR b.author ILIKE '%' || p_keyword || '%'
            OR b.isbn   ILIKE '%' || p_keyword || '%')
    ORDER BY b.title;
$$;

-- ---------------------------------------------------------------------
-- F5. fn_get_pending_requests | Admin approval queue (oldest first)
--     API: GET /api/borrowings/pending
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_pending_requests()
RETURNS TABLE (
    out_borrow_id        INT,
    out_requested_at     TIMESTAMPTZ,
    out_student_number   VARCHAR,
    out_student_name     TEXT,
    out_book_id          INT,
    out_title            VARCHAR,
    out_available_copies INT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT t.borrow_id, t.requested_at, u.student_number,
           u.first_name || ' ' || u.last_name,
           b.book_id, b.title, b.available_copies
    FROM   borrow_transactions t
    JOIN   users u ON u.user_id = t.user_id
    JOIN   books b ON b.book_id = t.book_id
    WHERE  t.status = 'pending_approval'
    ORDER BY t.requested_at;
$$;

-- ---------------------------------------------------------------------
-- F6. fn_get_user_borrowings | A student's own request/loan history
--     API: GET /api/borrowings/mine
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_borrowings(p_user_id INT)
RETURNS TABLE (
    out_borrow_id     INT,
    out_title         VARCHAR,
    out_status        VARCHAR,
    out_requested_at  TIMESTAMPTZ,
    out_due_date      DATE,
    out_decision_note TEXT,
    out_fine_amount   NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
    SELECT t.borrow_id, b.title, t.status, t.requested_at,
           t.due_date, t.decision_note, t.fine_amount
    FROM   borrow_transactions t
    JOIN   books b ON b.book_id = t.book_id
    WHERE  t.user_id = p_user_id
    ORDER BY t.requested_at DESC;
$$;

-- ---------------------------------------------------------------------
-- F7. fn_get_dashboard_stats | JSONB summary (computed, never stored)
--     API: GET /api/dashboard
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_books',         (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL),
        'available_copies',    (SELECT COALESCE(SUM(available_copies), 0) FROM books WHERE deleted_at IS NULL),
        'pending_requests',    (SELECT COUNT(*) FROM borrow_transactions WHERE status = 'pending_approval'),
        'active_borrowings',   (SELECT COUNT(*) FROM borrow_transactions WHERE status IN ('approved', 'borrowed')),
        'overdue_borrowings',  (SELECT COUNT(*) FROM borrow_transactions WHERE status = 'overdue'
                                   OR (status = 'borrowed' AND due_date < CURRENT_DATE)),
        'pending_returns',     (SELECT COUNT(*) FROM borrow_transactions WHERE status = 'pending_return'),
        'units_available',     (SELECT COUNT(*) FROM elibrary_units WHERE status = 'available' AND deleted_at IS NULL),
        'units_in_use',        (SELECT COUNT(*) FROM elibrary_units WHERE status = 'in_use' AND deleted_at IS NULL),
        'open_damage_reports', (SELECT COUNT(*) FROM damage_reports WHERE status IN ('open', 'under_review'))
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- F8. fn_get_user_for_login | Used by the login endpoint only
--     SECURITY DEFINER: the app role cannot read password_hash directly
--     (see 07_security.sql), but this one function may. search_path is
--     fixed, as the lecture's best-practice slide requires.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_for_login(p_email VARCHAR)
RETURNS TABLE (
    out_user_id       INT,
    out_full_name     TEXT,
    out_role          VARCHAR,
    out_status        VARCHAR,
    out_password_hash VARCHAR
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = library, pg_temp
AS $$
    SELECT user_id, first_name || ' ' || last_name, role, status, password_hash
    FROM   users
    WHERE  email = LOWER(TRIM(p_email)) AND deleted_at IS NULL;
$$;
