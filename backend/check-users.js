const pool = require('./db/database');

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM library_schema.users');
    
    if(result.rows.length === 0) {
      console.log('No users found in database!');
    } else {
      console.log('Users in database:');
      result.rows.forEach(user => {
        console.log(`  ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    process.exit(0);
  } catch(error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
