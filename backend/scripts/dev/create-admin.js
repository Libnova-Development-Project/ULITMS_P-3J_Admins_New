const pool = require('../../src/config/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('password', 10);
    console.log('Hashed password created');
    
    await pool.query(
      `INSERT INTO library_schema.users (student_id, name, email, password, role, is_active)
       VALUES (NULL, 'Administrator', 'admin123', $1, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET 
         password = EXCLUDED.password,
         name = EXCLUDED.name,
         is_active = true`,
      [hashedPassword]
    );
    
    console.log('Admin user created/updated successfully!');
    console.log('   Email: admin123');
    console.log('   Password: password');
    
    process.exit(0);
  } catch(error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
