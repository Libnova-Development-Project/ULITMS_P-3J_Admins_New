const pool = require('./database/db');

async function checkPCs() {
  try {
    const result = await pool.query('SELECT * FROM library_schema.elibrary_units WHERE is_deleted = false');
    console.log('PC Units in database:', result.rows);
    console.log('Total count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('Sample PC:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error checking PCs:', error);
  } finally {
    await pool.end();
  }
}
checkPCs();
