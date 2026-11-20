const pool = require('../../src/config/database');

async function checkLatestLogs() {
    try {
        const result = await pool.query("SELECT * FROM library_schema.activity_logs WHERE action IN ('CREATE_BOOK', 'DELETE_BOOK') ORDER BY created_at DESC LIMIT 5");
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLatestLogs();
