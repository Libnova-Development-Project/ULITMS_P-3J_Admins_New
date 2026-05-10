const pool = require('../database/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    console.log('🌱 Seeding database...');
    
    try {
        // Seed admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO NOTHING
        `, ['ADMIN001', 'System', 'Administrator', 'admin@ulitms.com', adminPassword, 'admin', true]);
        
        console.log('✅ Admin user seeded');
        
        // Seed book categories
        const categories = [
            'Programming', 'Literature', 'Science', 'Engineering', 
            'Mathematics', 'History', 'Philosophy', 'Arts'
        ];
        
        for (const category of categories) {
            await pool.query(`
                INSERT INTO library_schema.book_categories (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
            `, [category]);
        }
        
        console.log('✅ Book categories seeded');
        
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
        
        // Seed E-Library units
        for (let i = 1; i <= 20; i++) {
            await pool.query(`
                INSERT INTO library_schema.elibrary_units 
                (unit_number, label, location, condition, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (unit_number) DO NOTHING
            `, [i, `PC #${i}`, `E-Library Section ${Math.ceil(i/5)}`, 'good', true]);
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