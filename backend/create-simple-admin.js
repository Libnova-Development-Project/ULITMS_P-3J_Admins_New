const pool = require('./database/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const result = await pool.query(`
            INSERT INTO library_schema.users (
                first_name, last_name, email, password, role, student_id, 
                course, year_level, contact_number, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, first_name, last_name, email
        `, [
            'System',
            'Administrator', 
            'admin@ulitms.local', 
            hashedPassword, 
            'admin', 
            'ADMIN001',
            'Computer Science',
            4,
            '123-456-7890',
            true
        ]);
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@ulitms.local');
        console.log('🔑 Password: admin123');
        console.log('👤 Name: System Administrator');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await pool.end();
    }
}

createAdmin();
