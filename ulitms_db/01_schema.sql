-- =====================================================================
-- ULITMS | University Library Inventory and Transaction Management System
-- Advanced Database Systems - Final Project
-- File : 01_schema.sql   (STEP 1: schema "library", tables, constraints, indexes)
-- Style: follows the lecture slides (IDENTITY keys, named constraints,
--        CHECK lists, JSONB metadata, TIMESTAMPTZ, audit + system logs)
-- Run  : psql -d ulitms -f 01_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- SCHEMA: every ULITMS object lives in the schema named "library"
-- RESET (re-runnable). WARNING: deletes ALL ULITMS data.
-- ---------------------------------------------------------------------
DROP SCHEMA IF EXISTS library CASCADE;
CREATE SCHEMA library;
SET search_path TO library, public;   -- applies to this session/script

-- =====================================================================
-- GROUP A: CORE / ACCOUNTS
-- =====================================================================

-- Table 1: USERS  (admins and students)
CREATE TABLE users (
    user_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_number  VARCHAR(20) UNIQUE,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(10)  NOT NULL DEFAULT 'student'
                        CHECK (role IN ('admin', 'student')),
    contact_number  VARCHAR(20),
    course          VARCHAR(100),
    year_level      INT CHECK (year_level BETWEEN 1 AND 6),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended')),
    preferences     JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,                       -- soft delete
    CONSTRAINT ck_student_needs_number
        CHECK (role <> 'student' OR student_number IS NOT NULL)
);

-- =====================================================================
-- GROUP B: BOOK CATALOG
-- =====================================================================

-- Table 2: BOOK_CATEGORIES
CREATE TABLE book_categories (
    category_id    INT GENERATED ALWAYS AS IDENTITY,
    category_name  VARCHAR(100) NOT NULL,
    description    TEXT,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ,
    CONSTRAINT pk_book_categories PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name   UNIQUE (category_name)
);

-- Table 3: BOOKS  (inventory lives here: total_copies / available_copies)
CREATE TABLE books (
    book_id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn              VARCHAR(20) UNIQUE,
    title             VARCHAR(200) NOT NULL,
    author            VARCHAR(150) NOT NULL,
    publisher         VARCHAR(100),
    publication_year  INT CHECK (publication_year BETWEEN 1400 AND 2100),
    category_id       INT REFERENCES book_categories(category_id),
    total_copies      INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies  INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    cover_image       VARCHAR(255),
    description       TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive')),
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,                     -- soft delete
    CONSTRAINT ck_available_not_above_total
        CHECK (available_copies <= total_copies)
);

-- =====================================================================
-- GROUP C: BORROWING WORKFLOW (needs admin approval)
-- =====================================================================

-- Table 4: BORROW_TRANSACTIONS
-- Lifecycle: pending_approval -> approved -> borrowed -> pending_return
--            -> returned   (rejected / overdue / lost are side branches)
CREATE TABLE borrow_transactions (
    borrow_id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            INT NOT NULL REFERENCES users(user_id),
    book_id            INT NOT NULL REFERENCES books(book_id),
    status             VARCHAR(20) NOT NULL DEFAULT 'pending_approval'
                           CHECK (status IN ('pending_approval', 'approved', 'rejected',
                                             'borrowed', 'pending_return', 'returned',
                                             'overdue', 'lost')),
    requested_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by        INT REFERENCES users(user_id),   -- admin who decided
    reviewed_at        TIMESTAMPTZ,
    decision_note      TEXT,
    approved_at        TIMESTAMPTZ,
    borrowed_at        TIMESTAMPTZ,                      -- physical issue
    due_date           DATE,
    return_requested_at TIMESTAMPTZ,
    returned_at        TIMESTAMPTZ,
    confirmed_by       INT REFERENCES users(user_id),   -- admin who received book
    fine_amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0),
    metadata           JSONB DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ,
    -- business rules enforced by the database itself
    CONSTRAINT ck_no_self_approval
        CHECK (reviewed_by IS NULL OR reviewed_by <> user_id),
    CONSTRAINT ck_decision_has_admin
        CHECK (status NOT IN ('approved', 'rejected') OR reviewed_by IS NOT NULL),
    CONSTRAINT ck_loan_has_due_date
        CHECK (status IN ('pending_approval', 'rejected') OR due_date IS NOT NULL),
    CONSTRAINT ck_returned_has_date
        CHECK (status <> 'returned' OR returned_at IS NOT NULL)
);

-- One OPEN request/loan per student per book (duplicate-request rule)
CREATE UNIQUE INDEX uq_open_borrow_per_user_book
    ON borrow_transactions (user_id, book_id)
    WHERE status IN ('pending_approval', 'approved', 'borrowed', 'pending_return', 'overdue');

-- =====================================================================
-- GROUP D: E-LIBRARY AND EQUIPMENT
-- =====================================================================

-- Table 5: ELIBRARY_UNITS
CREATE TABLE elibrary_units (
    unit_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_code       VARCHAR(20) NOT NULL UNIQUE,
    location        VARCHAR(100),
    specifications  JSONB DEFAULT '{}'::jsonb,      -- cpu, ram, storage, os
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Table 6: ELIBRARY_SESSIONS
CREATE TABLE elibrary_sessions (
    session_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id),
    unit_id     INT NOT NULL REFERENCES elibrary_units(unit_id),
    time_in     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_out    TIMESTAMPTZ,                         -- NULL = session still active
    purpose     VARCHAR(200),
    metadata    JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT ck_time_order CHECK (time_out IS NULL OR time_out >= time_in)
);

-- Database-level protection against overlapping active sessions
CREATE UNIQUE INDEX uq_one_active_session_per_unit
    ON elibrary_sessions (unit_id) WHERE time_out IS NULL;
CREATE UNIQUE INDEX uq_one_active_session_per_user
    ON elibrary_sessions (user_id) WHERE time_out IS NULL;

-- Table 7: PERIPHERAL_CATEGORIES
CREATE TABLE peripheral_categories (
    category_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name  VARCHAR(100) NOT NULL UNIQUE,
    description    TEXT,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ
);

-- Table 8: PERIPHERALS
CREATE TABLE peripherals (
    peripheral_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_id         INT REFERENCES elibrary_units(unit_id),
    category_id     INT NOT NULL REFERENCES peripheral_categories(category_id),
    name            VARCHAR(100) NOT NULL,
    brand           VARCHAR(50),
    model           VARCHAR(50),
    serial_number   VARCHAR(80) UNIQUE,
    specifications  JSONB DEFAULT '{}'::jsonb,
    condition       VARCHAR(20) NOT NULL DEFAULT 'good'
                        CHECK (condition IN ('good', 'damaged', 'repair_needed', 'missing')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Table 9: DAMAGE_REPORTS
CREATE TABLE damage_reports (
    report_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reported_by      INT NOT NULL REFERENCES users(user_id),
    unit_id          INT REFERENCES elibrary_units(unit_id),
    peripheral_id    INT REFERENCES peripherals(peripheral_id),
    damage_type      VARCHAR(50)  NOT NULL,
    description      TEXT NOT NULL,
    severity         VARCHAR(10)  NOT NULL DEFAULT 'minor'
                         CHECK (severity IN ('minor', 'moderate', 'severe')),
    status           VARCHAR(20)  NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
    reported_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_by      INT REFERENCES users(user_id),
    resolved_at      TIMESTAMPTZ,
    resolution_notes TEXT,
    metadata         JSONB DEFAULT '{}'::jsonb,
    updated_at       TIMESTAMPTZ,
    CONSTRAINT ck_report_has_target
        CHECK (unit_id IS NOT NULL OR peripheral_id IS NOT NULL),
    CONSTRAINT ck_resolved_has_admin
        CHECK (status NOT IN ('resolved', 'closed')
               OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL))
);

-- =====================================================================
-- GROUP E: NOTIFICATIONS, AUDIT TRAIL, SYSTEM LOGS
-- =====================================================================

-- Table 10: NOTIFICATIONS  (missing from the original ULITMS schema)
CREATE TABLE notifications (
    notification_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(user_id),   -- recipient
    type             VARCHAR(30) NOT NULL,
    title            VARCHAR(150) NOT NULL,
    message          TEXT NOT NULL,
    reference        JSONB DEFAULT '{}'::jsonb,                -- e.g. {"borrow_id": 5}
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 11: AUDIT_LOGS  (same idea as student_audit in the lecture,
--          but universal: one table for every audited table)
CREATE TABLE audit_logs (
    audit_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR(50) NOT NULL,
    record_id    INT NOT NULL,
    operation    VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data     JSONB,
    new_data     JSONB,
    changed_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changed_by   VARCHAR(50) DEFAULT CURRENT_USER,   -- database role
    app_user_id  INT                                 -- ULITMS user (set by the API)
);

-- Table 12: SYSTEM_LOGS  (identical to the lecture's system_logs)
CREATE TABLE system_logs (
    log_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    log_level  VARCHAR(10) NOT NULL,
    message    TEXT NOT NULL,
    context    JSONB,
    logged_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- INDEXES  (only where real queries need them; UNIQUE columns already
--           have an index, so no duplicates - a gap flagged in ULITMS doc)
-- =====================================================================
CREATE INDEX idx_books_title            ON books (title);
CREATE INDEX idx_books_category         ON books (category_id);
CREATE INDEX idx_books_metadata_gin     ON books USING GIN (metadata);
CREATE INDEX idx_borrow_user            ON borrow_transactions (user_id);
CREATE INDEX idx_borrow_book            ON borrow_transactions (book_id);
CREATE INDEX idx_borrow_status          ON borrow_transactions (status);
CREATE INDEX idx_borrow_due_date        ON borrow_transactions (due_date)
                                         WHERE status IN ('borrowed', 'overdue');
CREATE INDEX idx_units_specs_gin        ON elibrary_units USING GIN (specifications);
CREATE INDEX idx_sessions_user          ON elibrary_sessions (user_id);
CREATE INDEX idx_peripherals_unit       ON peripherals (unit_id);
CREATE INDEX idx_damage_status          ON damage_reports (status);
CREATE INDEX idx_notifications_user     ON notifications (user_id, is_read);
CREATE INDEX idx_audit_table_record     ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_changed_at       ON audit_logs (changed_at);
