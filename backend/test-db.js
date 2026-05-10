const pool = require('./db/database');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log('Server time:', result.rows[0].current_time);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Is PostgreSQL installed?');
    console.error('2. Is PostgreSQL service running?');
    console.error('3. Are the .env credentials correct?');
    process.exit(1);
  }
}

testConnection();
