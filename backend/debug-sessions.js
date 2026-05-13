const pool = require('./database/db');

async function debugSessions() {
    try {
        console.log('🔍 Debugging session data...');
        
        // Check all PCs and their current status
        const pcs = await pool.query('SELECT * FROM library_schema.elibrary_units WHERE is_deleted = false');
        console.log('Total PCs:', pcs.rows.length);
        
        // Check all active sessions
        const sessions = await pool.query('SELECT * FROM library_schema.elibrary_sessions WHERE time_out IS NULL');
        console.log('Active sessions:', sessions.rows.length);
        
        // Show which PCs have active sessions
        const pcsWithSessions = pcs.rows.map(pc => {
            const activeSession = sessions.rows.find(session => session.unit_id === pc.id);
            return {
                ...pc,
                hasActiveSession: !!activeSession,
                activeSessionId: activeSession ? activeSession.id : null,
                activeSessionTime: activeSession ? activeSession.time_in : null
            };
        });
        
        console.log('PC Status:');
        pcsWithSessions.forEach(pc => {
            console.log(`  PC #${pc.unit_number}: ${pc.label} - Active: ${pc.hasActiveSession ? 'YES' : 'NO'}`);
            if (pc.hasActiveSession) {
                console.log(`    Session ID: ${pc.activeSessionId}, Time: ${pc.activeSessionTime}`);
            }
        });
        
        // Check for orphaned sessions (sessions without valid PCs)
        const orphanedSessions = sessions.rows.filter(session => {
            return !pcs.rows.find(pc => pc.id === session.unit_id);
        });
        
        if (orphanedSessions.length > 0) {
            console.log('\n⚠️  Orphaned sessions found:');
            orphanedSessions.forEach(session => {
                console.log(`    Session ID: ${session.id}, Unit ID: ${session.unit_id} (PC not found!)`);
            });
        }
        
    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        await pool.end();
    }
}

debugSessions();
