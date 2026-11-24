-- =====================================================================
-- ULITMS | File: 02_seed.sql   (sample data for testing and the demo)
-- Run AFTER 01_schema.sql.
SET search_path TO library, public;

-- Demo logins (password hashes are real bcrypt, cost 10):
--   admin    : admin@ulitms.edu      / Admin@123
--   students : juan@, maria@, pedro@ulitms.edu / Student@123
-- =====================================================================

INSERT INTO users (student_number, first_name, last_name, email, password_hash, role, course, year_level, contact_number) VALUES
(NULL,        'Library', 'Admin',  'admin@ulitms.edu',  '$2b$10$ipB08.SmzqICh01H7xgXxOV88PBZnR/NQR6rFk3b4v95f10G8FlrK', 'admin',   NULL,   NULL, '09170000001'),
('2026-0001', 'Juan',    'Dela Cruz', 'juan@ulitms.edu', '$2b$10$eMMuTu7q6zEq2VPfLNAekeeu2YYP7MGdDCPwUj2O7ibLYMhhPknPW', 'student', 'BS Information Systems', 3, '09170000002'),
('2026-0002', 'Maria',   'Clara',     'maria@ulitms.edu','$2b$10$eMMuTu7q6zEq2VPfLNAekeeu2YYP7MGdDCPwUj2O7ibLYMhhPknPW', 'student', 'BS Information Systems', 2, '09170000003'),
('2026-0003', 'Pedro',   'Penduko',   'pedro@ulitms.edu','$2b$10$eMMuTu7q6zEq2VPfLNAekeeu2YYP7MGdDCPwUj2O7ibLYMhhPknPW', 'student', 'BS Computer Science',    1, '09170000004');

INSERT INTO book_categories (category_name, description) VALUES
('Computer Science',  'Programming, databases, networks'),
('Mathematics',       'Algebra, calculus, statistics'),
('Literature',        'Novels, poetry, essays'),
('Reference',         'Dictionaries and encyclopedias');

INSERT INTO books (isbn, title, author, publisher, publication_year, category_id, total_copies, available_copies, metadata) VALUES
('9780133970777', 'Database System Concepts',        'Silberschatz, Korth, Sudarshan', 'McGraw-Hill', 2019, 1, 3, 3, '{"edition": "7th", "shelf": "CS-01"}'),
('9781492089537', 'PostgreSQL: Up and Running',      'Regina Obe, Leo Hsu',            'O''Reilly',   2017, 1, 2, 2, '{"edition": "3rd", "shelf": "CS-02"}'),
('9780134685991', 'Effective Java',                  'Joshua Bloch',                   'Pearson',     2018, 1, 1, 1, '{"edition": "3rd", "shelf": "CS-03"}'),
('9780073383095', 'Discrete Mathematics',            'Kenneth Rosen',                  'McGraw-Hill', 2018, 2, 2, 2, '{"edition": "8th", "shelf": "MA-01"}'),
('9780743273565', 'The Great Gatsby',                'F. Scott Fitzgerald',            'Scribner',    2004, 3, 2, 2, '{"shelf": "LT-01"}'),
('9780199571123', 'Oxford English Dictionary',       'Oxford Press',                   'Oxford',      2010, 4, 1, 1, '{"reference_only": true, "shelf": "RF-01"}');

INSERT INTO elibrary_units (unit_code, location, specifications) VALUES
('PC-01', 'E-Library Room A', '{"cpu": "Core i5", "ram_gb": 16, "storage": "512GB SSD", "os": "Windows 11"}'),
('PC-02', 'E-Library Room A', '{"cpu": "Core i5", "ram_gb": 16, "storage": "512GB SSD", "os": "Windows 11"}'),
('PC-03', 'E-Library Room B', '{"cpu": "Ryzen 5", "ram_gb": 8,  "storage": "256GB SSD", "os": "Windows 10"}');

INSERT INTO peripheral_categories (category_name, description) VALUES
('Monitor',  'Display units'),
('Keyboard', 'Input devices'),
('Mouse',    'Pointing devices');

INSERT INTO peripherals (unit_id, category_id, name, brand, model, serial_number) VALUES
(1, 1, 'PC-01 Monitor',  'Dell',     'P2422H',  'SN-MON-0001'),
(1, 2, 'PC-01 Keyboard', 'Logitech', 'K120',    'SN-KEY-0001'),
(2, 1, 'PC-02 Monitor',  'Dell',     'P2422H',  'SN-MON-0002'),
(3, 3, 'PC-03 Mouse',    'Logitech', 'M90',     'SN-MOU-0003');
