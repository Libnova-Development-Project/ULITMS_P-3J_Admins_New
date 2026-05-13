const pool = require('./database/db');

async function testSession() {
  try {
    console.log('Testing session creation for PC #1...');
    
    // First, let's check if there are any active sessions
    const activeSessions = await pool.query(
        `SELECT * FROM library_schema.elibrary_sessions 
         WHERE unit_id = $1 AND time_out IS NULL`,
        [1]
    );
    
    console.log('Active sessions for PC #1:', activeSessions.rows.length);
    
    if (activeSessions.rows.length > 0) {
        console.log('Found active sessions:');
        activeSessions.rows.forEach((session, index) => {
            console.log(`  Session ${index + 1}:`, {
                id: session.id,
                user_id: session.user_id,
                unit_id: session.unit_id,
                time_in: session.time_in,
                time_out: session.time_out
            });
        });
    }
    
    // Now try to create a new session
    try {
        const result = await pool.query(
        'INSERT INTO library_schema.elibrary_sessions (user_id, unit_id, purpose, monitored_by, time_in) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
        [1, 1, 'Test session', 1]
    );
        
        console.log('Session creation result:', result.rows[0]);
        
    } catch (error) {
        console.error('Session creation error:', error.message);
    } 
}
testSession();
