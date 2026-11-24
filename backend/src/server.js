const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

// Fail early with a clear message instead of a confusing "procedure does not exist" later.
async function checkDatabase() {
  try {
    const { rows } = await pool.query(
      `SELECT current_user AS db_user, to_regclass('library.users') AS users_table,
              to_regprocedure('library.sp_submit_borrow_request(integer,integer,integer)') AS proc`);
    const r = rows[0];
    if (!r.users_table || !r.proc) {
      console.error(`\nDATABASE NOT READY (connected to "${env.db.database}" as "${r.db_user}").`);
      console.error('The schema "library" or its procedures are missing. Run ulitms_db/01_schema.sql ... 07_security.sql on THIS database,');
      console.error('and check DB_NAME / DB_USER in .env (DB_USER should be app_user).\n');
      process.exit(1);
    }
    if (r.db_user !== 'app_user') {
      console.warn(`WARNING: connected as "${r.db_user}", not app_user. Security grants from 07_security.sql are bypassed.`);
    }
  } catch (err) {
    console.error(`\nCannot connect to PostgreSQL (${env.db.host}:${env.db.port}/${env.db.database} as ${env.db.user}): ${err.message}`);
    console.error('Check that PostgreSQL is running and the DB_* values in .env are correct.\n');
    process.exit(1);
  }
}

let server;
checkDatabase().then(() => {
  server = app.listen(env.port, () => {
    console.log(`ULITMS API listening on http://localhost:${env.port}/api`);
  });
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (server) server.close(async () => { await pool.end(); process.exit(0); });
  else { await pool.end(); process.exit(0); }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
