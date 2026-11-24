const pool = require('../../src/config/database');

async function checkAdmin() {
    try {
        const result = await pool.query('SELECT * FROM library_schema.users WHERE email = $1', ['admin@ulitms.local']);
        console.log('Admin user found:', result.rows.length > 0);
        if (result.rows.length > 0) {
            console.log('Admin details:', result.rows[0]);
        }
    } catch (error) {
        console.error('Error checking admin:', error);
    } finally {
        await pool.end();
    }
}

checkAdmin();
