-- =========================================================
-- UNIVERSITY LIBRARY INVENTORY AND TRANSACTION
-- MANAGEMENT SYSTEM FOR TRADITIONAL
-- AND E-LIBRARY INTEGRATION
--
-- PostgreSQL Database Schema
-- Final Improved Version
-- With:
-- ✔ Normalization
-- ✔ Soft Delete
-- ✔ JSON + JSONB Implementation
-- ✔ Audit Logs
-- ✔ Constraints
-- ✔ Triggers
-- ✔ Indexes
-- =========================================================

CREATE SCHEMA IF NOT EXISTS library_schema;

-- =========================================================
-- ENUM TYPES
-- =========================================================

CREATE TYPE library_schema.user_role AS ENUM (
    'admin',
    'student'
);

CREATE TYPE library_schema.book_status AS ENUM (
    'available',
    'borrowed',
    'reserved',
    'maintenance',
    'lost'
);

CREATE TYPE library_schema.borrow_status AS ENUM (
    'borrowed',
    'returned',
    'overdue',
    'lost'
);

CREATE TYPE library_schema.condition_status AS ENUM (
    'good',
    'damaged',
    'repair_needed',
    'missing'
);

CREATE TYPE library_schema.damage_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- =========================================================
-- USERS TABLE
-- =========================================================

CREATE TABLE library_schema.users (
    id SERIAL PRIMARY KEY,

    student_id VARCHAR(50) UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    password VARCHAR(255) NOT NULL,

    role library_schema.user_role NOT NULL
        DEFAULT 'student',

    contact_number VARCHAR(20),

    course VARCHAR(100),

    year_level SMALLINT
        CHECK (year_level BETWEEN 1 AND 6),

    is_active BOOLEAN DEFAULT TRUE,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	preferences JSONB DEFAULT '{"theme": "light", "notifications": true}'::jsonb
);

-- =========================================================
-- BOOK CATEGORIES
-- =========================================================

CREATE TABLE library_schema.book_categories (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- BOOKS TABLE
-- =========================================================

CREATE TABLE library_schema.books (
    id SERIAL PRIMARY KEY,

    isbn VARCHAR(20) UNIQUE,

    title VARCHAR(255) NOT NULL,

    author VARCHAR(255) NOT NULL,

    publisher VARCHAR(150),

    publication_year SMALLINT,

    category_id INTEGER
        REFERENCES library_schema.book_categories(id)
        ON DELETE SET NULL,

    total_copies INTEGER NOT NULL
        CHECK (total_copies >= 0),

    available_copies INTEGER NOT NULL
        CHECK (
            available_copies >= 0
            AND available_copies <= total_copies
        ),

    cover_image_url TEXT,

    description TEXT,

    metadata JSONB,

    status library_schema.book_status
        DEFAULT 'available',

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- BORROW TRANSACTIONS
-- =========================================================

CREATE TABLE library_schema.borrow_transactions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES library_schema.users(id)
        ON DELETE CASCADE,

    book_id INTEGER NOT NULL
        REFERENCES library_schema.books(id)
        ON DELETE CASCADE,

    borrowed_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    due_date DATE NOT NULL,

    returned_at TIMESTAMP,

    status library_schema.borrow_status
        DEFAULT 'borrowed',

    fine_amount NUMERIC(10,2)
        DEFAULT 0.00
        CHECK (fine_amount >= 0),

    is_paid BOOLEAN DEFAULT FALSE,

    processed_by INTEGER
        REFERENCES library_schema.users(id)
        ON DELETE SET NULL,

    notes TEXT,

    transaction_metadata JSONB,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ELIBRARY UNITS
-- =========================================================

CREATE TABLE library_schema.elibrary_units (
    id SERIAL PRIMARY KEY,

    unit_number SMALLINT UNIQUE NOT NULL,

    label VARCHAR(50),

    location VARCHAR(100),

    specs JSONB,

    condition library_schema.condition_status
        DEFAULT 'good',

    is_active BOOLEAN DEFAULT TRUE,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PERIPHERAL CATEGORIES
-- =========================================================

CREATE TABLE library_schema.peripheral_categories (
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) UNIQUE NOT NULL,

    description TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PERIPHERALS
-- =========================================================

CREATE TABLE library_schema.peripherals (
    id SERIAL PRIMARY KEY,

    unit_id INTEGER NOT NULL
        REFERENCES library_schema.elibrary_units(id)
        ON DELETE CASCADE,

    category_id INTEGER
        REFERENCES library_schema.peripheral_categories(id)
        ON DELETE SET NULL,

    name VARCHAR(100) NOT NULL,

    brand VARCHAR(100),

    model VARCHAR(100),

    serial_number VARCHAR(100) UNIQUE,

    specifications JSONB,

    condition library_schema.condition_status
        DEFAULT 'good',

    is_active BOOLEAN DEFAULT TRUE,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ELIBRARY SESSIONS
-- =========================================================

CREATE TABLE library_schema.elibrary_sessions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES library_schema.users(id)
        ON DELETE CASCADE,

    unit_id INTEGER NOT NULL
        REFERENCES library_schema.elibrary_units(id)
        ON DELETE CASCADE,

    time_in TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    time_out TIMESTAMP,

    CHECK (
        time_out IS NULL
        OR time_out >= time_in
    ),

    purpose VARCHAR(255),

    session_metadata JSONB,

    monitored_by INTEGER
        REFERENCES library_schema.users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- DAMAGE REPORTS
-- =========================================================

CREATE TABLE library_schema.damage_reports (
    id SERIAL PRIMARY KEY,

    reported_by INTEGER
        REFERENCES library_schema.users(id)
        ON DELETE SET NULL,

    unit_id INTEGER
        REFERENCES library_schema.elibrary_units(id)
        ON DELETE SET NULL,

    peripheral_id INTEGER
        REFERENCES library_schema.peripherals(id)
        ON DELETE SET NULL,

    damage_type VARCHAR(100),

    description TEXT,

    severity library_schema.damage_severity
        DEFAULT 'low',

    damage_metadata JSONB,

    resolved_by INTEGER
        REFERENCES library_schema.users(id)
        ON DELETE SET NULL,

    resolved_at TIMESTAMP,

    resolution_notes TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ACTIVITY LOGS
-- JSON + JSONB IMPLEMENTATION
-- =========================================================

CREATE TABLE library_schema.activity_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES library_schema.users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    raw_log JSON,

    log_data JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_student_id
ON library_schema.users(student_id);

CREATE INDEX idx_users_email
ON library_schema.users(email);

CREATE INDEX idx_books_title
ON library_schema.books(title);

CREATE INDEX idx_books_isbn
ON library_schema.books(isbn);

CREATE INDEX idx_borrow_user
ON library_schema.borrow_transactions(user_id);

CREATE INDEX idx_borrow_book
ON library_schema.borrow_transactions(book_id);

CREATE INDEX idx_sessions_user
ON library_schema.elibrary_sessions(user_id);

CREATE INDEX idx_sessions_unit
ON library_schema.elibrary_sessions(unit_id);

CREATE INDEX idx_peripherals_unit
ON library_schema.peripherals(unit_id);

-- =========================================================
-- JSONB INDEXES
-- =========================================================

CREATE INDEX idx_books_metadata
ON library_schema.books
USING GIN(metadata);

CREATE INDEX idx_elibrary_specs
ON library_schema.elibrary_units
USING GIN(specs);

CREATE INDEX idx_peripheral_specs
ON library_schema.peripherals
USING GIN(specifications);

CREATE INDEX idx_activity_logs
ON library_schema.activity_logs
USING GIN(log_data);

-- =========================================================
-- UPDATED_AT AUTO UPDATE FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION
library_schema.update_updated_at_column()

RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON library_schema.users
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_books_updated
BEFORE UPDATE ON library_schema.books
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_book_categories_updated
BEFORE UPDATE ON library_schema.book_categories
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_borrow_transactions_updated
BEFORE UPDATE ON library_schema.borrow_transactions
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_elibrary_units_updated
BEFORE UPDATE ON library_schema.elibrary_units
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_peripheral_categories_updated
BEFORE UPDATE ON library_schema.peripheral_categories
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_peripherals_updated
BEFORE UPDATE ON library_schema.peripherals
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();

CREATE TRIGGER trg_damage_reports_updated
BEFORE UPDATE ON library_schema.damage_reports
FOR EACH ROW
EXECUTE FUNCTION library_schema.update_updated_at_column();