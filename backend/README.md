# ULITMS Backend (Express + PostgreSQL)

REST API for the University Library Inventory and Transaction Management System.
Layout: `routes -> middleware -> controllers -> models -> PostgreSQL functions / procedures`.
Business rules (approval, inventory, fines, audit) live in the database (`ulitms_db/`); the API authenticates,
validates input and calls them. 31 endpoints: see `docs/API_ENDPOINTS.md`.

## 1. Requirements (all free)
Node.js 18+ (20 recommended), PostgreSQL 15+, Postman.

## 2. Database (once)
Create a database named `ulitms`, then run `01_schema.sql` ... `07_security.sql` from `ulitms_db/` in order, on THAT database.
```
psql -U postgres -c "CREATE DATABASE ulitms;"
psql -U postgres -d ulitms -f 01_schema.sql      (then 02, 03, 04, 05, 06, 07)
```
`07_security.sql` creates the role `app_user` (password `ulitms_app_2026` - change it for real use).

## 3. Configure
```
copy .env.example .env          (Windows)     |     cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Paste the random text as `JWT_SECRET` in `.env`. Keep `DB_USER=app_user` and `DB_NAME=ulitms`.
Set `DB_PORT` if PostgreSQL does not use 5432. `.env` holds secrets: never share it or commit it.

## 4. Run
```
npm install
npm run dev
```
Open http://localhost:3000/api/health -> `"db_user":"app_user","schema":"library"`.
The server checks the database at startup and prints a clear message if something is wrong.

## 5. Try it
Import `docs/ULITMS.postman_collection.json` in Postman. Run the two login requests first (they store the tokens).
Demo accounts: `admin@ulitms.edu / Admin@123`, `juan@ulitms.edu / Student@123`.

## 6. Tests
`npm test` runs 9 end-to-end tests (HTTP -> Express -> PostgreSQL). Run them on a FRESH database
(reload 01-07 first) because the tests change data.

## Security built in
- JWT Bearer token; the account is re-checked in the database on every request (a suspended or deleted user loses access at once).
- The acting user comes from the token, never from the request body; the role comes from the database.
- bcrypt password hashes, strict zod validation (unknown fields rejected), parameterized SQL only.
- `helmet`, CORS limited to `CORS_ORIGIN`, rate limits (login and general), no secrets in code.
- Database errors are mapped to clean HTTP codes; internals are never sent to the client.
- Procedures COMMIT by themselves: they are called with a plain query, never inside BEGIN/COMMIT.

## Troubleshooting
| Message | Cause / fix |
|---|---|
| `Missing required environment variable` | `.env` missing or incomplete: copy `.env.example` |
| `Cannot connect to PostgreSQL` | PostgreSQL not running, or wrong `DB_PORT` / password |
| `DATABASE NOT READY` | SQL files 01-07 not loaded on the database named in `DB_NAME` |
| `WARNING: connected as "postgres"` | set `DB_USER=app_user` so the security grants apply |
