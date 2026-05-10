const pool = require('../database/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    console.log('🌱 Seeding database...');
    
    try {
        // Seed admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminResult = await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE SET 
                password = EXCLUDED.password,
                is_active = true
            RETURNING id
        `, ['ADMIN001', 'System', 'Administrator', 'admin@ulitms.com', adminPassword, 'admin', true]);
        
        console.log('✅ Admin user seeded');
        
        // Seed a test student
        const studentPassword = await bcrypt.hash('student123', 10);
        await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active, course, year_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (student_id) DO NOTHING
        `, ['2024-01018', 'John', 'Doe', 'student@ulitms.com', studentPassword, 'student', true, 'BS Information Technology', 3]);
        
        console.log('✅ Test student seeded');
        
        // Seed book categories
        const categories = [
            'Programming', 'Literature', 'Science', 'Engineering', 
            'Mathematics', 'History', 'Philosophy', 'Arts', 'Business', 'Psychology'
        ];
        
        for (const category of categories) {
            await pool.query(`
                INSERT INTO library_schema.book_categories (name, description)
                VALUES ($1, $2)
                ON CONFLICT (name) DO NOTHING
            `, [category, `${category} books collection`]);
        }
        
        console.log('✅ Book categories seeded');
        
        // Seed sample books
        const sampleBooks = [
            { isbn: '978-3-16-148410-0', title: 'Modern Information Management', author: 'Calumba, P.', category: 'Programming', copies: 5 },
            { isbn: '978-0-12-345678-9', title: 'Database Design Fundamentals', author: 'Realiza, J.', category: 'Programming', copies: 3 },
            { isbn: '978-1-40-289462-8', title: 'Philippine Literature', author: 'Santos, M.', category: 'Literature', copies: 4 },
            { isbn: '978-0-55-123456-7', title: 'Calculus Vol. 2', author: 'Cruz, A.', category: 'Mathematics', copies: 2 },
            { isbn: '978-2-71-123456-7', title: 'Civil Engineering Handbook', author: 'Torres, L.', category: 'Engineering', copies: 3 },
            { isbn: '978-5-30-123456-7', title: 'Data Structures & Algorithms', author: 'Reyes, K.', category: 'Programming', copies: 4 },
            { isbn: '978-4-18-123456-7', title: 'Network Fundamentals', author: 'Dela Cruz, B.', category: 'Engineering', copies: 2 },
            { isbn: '978-6-22-123456-7', title: 'Introduction to Programming', author: 'Garcia, R.', category: 'Programming', copies: 5 },
            { isbn: '978-7-44-123456-7', title: 'Operating Systems Concepts', author: 'Lim, C.', category: 'Programming', copies: 3 },
            { isbn: '978-8-55-123456-7', title: 'Web Development Essentials', author: 'Bautista, M.', category: 'Programming', copies: 4 },
        ];
        
        for (const book of sampleBooks) {
            const categoryResult = await pool.query(
                'SELECT id FROM library_schema.book_categories WHERE name = $1',
                [book.category]
            );
            const categoryId = categoryResult.rows[0]?.id;
            
            if (categoryId) {
                await pool.query(`
                    INSERT INTO library_schema.books 
                    (isbn, title, author, category_id, total_copies, available_copies, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (isbn) DO NOTHING
                `, [book.isbn, book.title, book.author, categoryId, book.copies, book.copies, 'available']);
            }
        }
        
        console.log('✅ Sample books seeded');
        
        // Seed peripheral categories
        const peripheralCategories = [
            'Keyboard', 'Mouse', 'Headset', 'Monitor', 
            'Webcam', 'Printer', 'Scanner', 'USB Drive'
        ];
        
        for (const category of peripheralCategories) {
            await pool.query(`
                INSERT INTO library_schema.peripheral_categories (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
            `, [category]);
        }
        
        console.log('✅ Peripheral categories seeded');
        
        // Seed E-Library units with peripherals
        for (let i = 1; i <= 20; i++) {
            const unitResult = await pool.query(`
                INSERT INTO library_schema.elibrary_units 
                (unit_number, label, location, condition, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (unit_number) DO NOTHING
                RETURNING id
            `, [i, `PC #${i}`, `E-Library Section ${Math.ceil(i/5)}`, 'good', true]);
            
            const unitId = unitResult.rows[0]?.id;
            
            // Add peripherals to first few units
            if (unitId && i <= 5) {
                // Add keyboard
                await pool.query(`
                    INSERT INTO library_schema.peripherals 
                    (unit_id, name, brand, condition, is_active)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                `, [unitId, 'Keyboard', 'Logitech', 'good', true]);
                
                // Add mouse
                await pool.query(`
                    INSERT INTO library_schema.peripherals 
                    (unit_id, name, brand, condition, is_active)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                `, [unitId, 'Mouse', 'Logitech', 'good', true]);
            }
        }
        
        console.log('✅ E-Library units seeded');
        console.log('🎉 Database seeding completed!');
        
    } catch (error) {
        console.error('❌ Seeding error:', error);
    } finally {
        pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;