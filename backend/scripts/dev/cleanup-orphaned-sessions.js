const pool = require('../../src/config/database');

async function cleanupOrphanedSessions() {
    try {
        console.log('🧹 Cleaning up orphaned sessions...');
        
        // Find all active sessions
        const activeSessions = await pool.query(
            'SELECT * FROM library_schema.elibrary_sessions WHERE time_out IS NULL'
        );
        
        console.log(`Found ${activeSessions.rows.length} active sessions`);
        
        // For each active session, check if the PC exists
        for (const session of activeSessions.rows) {
            const pcCheck = await pool.query(
                'SELECT id FROM library_schema.elibrary_units WHERE id = $1 AND is_deleted = false',
                [session.unit_id]
            );
            
            // If PC doesn't exist, end the session
            if (pcCheck.rows.length === 0) {
                console.log(`Ending orphaned session ${session.id} - PC ${session.unit_id} not found`);
                
                await pool.query(
                    'UPDATE library_schema.elibrary_sessions SET time_out = CURRENT_TIMESTAMP WHERE id = $1',
                    [session.id]
                );
                
                // Log the cleanup
                await pool.query(
                    'INSERT INTO library_schema.activity_logs (user_id, action, log_data) VALUES ($1, $2, $3)',
                    [session.user_id, 'CLEANUP_ORPHANED_SESSION', { session_id: session.id, unit_id: session.unit_id }]
                );
            }
        }
        
        console.log('✅ Cleanup completed');
        
    } catch (error) {
        console.error('Cleanup error:', error);
    } finally {
        await pool.end();
    }
}

cleanupOrphanedSessions();
