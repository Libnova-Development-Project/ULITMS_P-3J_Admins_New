const pool = require('../database/db');
const bcrypt = require('bcryptjs');

async function createUsers() {
    try {
        // Hash passwords
        const studentPassword = await bcrypt.hash('student123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        // Create student user
        const studentResult = await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active, course, year_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (student_id) DO UPDATE SET 
                password = EXCLUDED.password,
                is_active = true
            RETURNING id, email, role
        `, ['24-A-00599', 'John', 'Doe', 'student@ulitms.com', studentPassword, 'student', true, 'BS Information Technology', 3]);
        
        console.log('✅ Student user created:', studentResult.rows[0]);
        
        // Create admin user
        const adminResult = await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE SET 
                password = EXCLUDED.password,
                is_active = true
            RETURNING id, email, role
        `, [null, 'Admin', 'User', 'admin@ulitms.com', adminPassword, 'admin', true]);
        
        console.log('✅ Admin user created:', adminResult.rows[0]);
        
        console.log('\n📝 Login Credentials:');
        console.log('Student - ID: 2024-01018 or Email: student@ulitms.com | Password: student123');
        console.log('Admin - Email: admin@ulitms.com | Password: admin123');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating users:', error);
        process.exit(1);
    }
}

createUsers();