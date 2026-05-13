const pool = require('./database/db');

async function checkStudent() {
    try {
        const result = await pool.query('SELECT * FROM library_schema.users WHERE student_id = $1', ['24-A-00599']);
        console.log('Student user found:', result.rows.length > 0);
        if (result.rows.length > 0) {
            console.log('Student details:', result.rows[0]);
        } else {
            console.log('Student user not found, creating one...');
            
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('student123', 10);
            
            await pool.query(`
                INSERT INTO library_schema.users (
                    first_name, last_name, student_id, email, password, role, 
                    course, year_level, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                'Demo', 'Student', '24-A-00599', 'student@ulitms.local', 
                hashedPassword, 'student', 'Computer Science', 3, true
            ]);
            
            console.log('✅ Student user created successfully!');
            console.log('📧 Student ID: 24-A-00599');
            console.log('🔑 Password: student123');
        }
    } catch (error) {
        console.error('Error checking/creating student:', error);
    } finally {
        await pool.end();
    }
}

checkStudent();
