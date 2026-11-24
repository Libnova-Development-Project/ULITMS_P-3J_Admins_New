const pool = require('../../src/config/database');
const bcrypt = require('bcryptjs');

async function createUsers() {
    try {
        console.log('🔧 Creating users...');
        
        // Hash passwords
        const studentPassword = await bcrypt.hash('student123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        // Create student user with new ID format
        const studentResult = await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active, course, year_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (student_id) DO UPDATE SET 
                password = EXCLUDED.password,
                is_active = true
            RETURNING id, email, role, student_id
        `, ['24-A-00599', 'John', 'Doe', 'student@ulitms.com', studentPassword, 'student', true, 'BS Information Technology', 3]);
        
        console.log('✅ Student user created/updated:', studentResult.rows[0]);
        
        // Create admin user (admin doesn't need student_id format)
        const adminResult = await pool.query(`
            INSERT INTO library_schema.users 
            (student_id, first_name, last_name, email, password, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE SET 
                password = EXCLUDED.password,
                is_active = true
            RETURNING id, email, role
        `, [null, 'Admin', 'User', 'admin@ulitms.com', adminPassword, 'admin', true]);
        
        console.log('✅ Admin user created/updated:', adminResult.rows[0]);
        
        console.log('\n📝 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👨‍🎓 STUDENT:');
        console.log('   Student ID: 24-A-00599');
        console.log('   Email: student@ulitms.com');
        console.log('   Password: student123');
        console.log('');
        console.log('👑 ADMIN:');
        console.log('   Email: admin@ulitms.com');
        console.log('   Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📌 Student ID Format: YY-B-XXXXX');
        console.log('   Example: 24-A-00599 (Year 24, Block A, Number 00599)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating users:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createUsers();