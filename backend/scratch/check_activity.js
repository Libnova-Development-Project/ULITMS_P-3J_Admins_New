const fs = require('fs');
const path = require('path');

// This is a guess, let's look for log files or just run the server and watch
console.log('Checking recent activity...');

// Actually, I can't easily check the 'npm run dev' output history without a tool.
// I'll check the database for recent activity logs which might show errors if they were logged.

const pool = require('../database/db');

async function checkErrors() {
    try {
        const result = await pool.query('SELECT * FROM library_schema.activity_logs ORDER BY created_at DESC LIMIT 5');
        console.table(result.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkErrors();
