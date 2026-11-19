# NEXUS NIDS — updated complete source

## Start with Docker (recommended)
1. Make a backup of your previous database and source.
2. Copy `.env.example` to `.env`; replace placeholder passwords and generate new SECRET_KEY and SESSION_SECRET_KEY.
3. If upgrading an existing PostgreSQL DB, run `backend/migrations/20261119_username.sql` against it **before starting the updated backend** (for example `docker compose exec -T db psql -U postgres -d nexus_db < backend/migrations/20261119_username.sql` while the DB container is already running). A new database needs no migration.
4. `docker compose up --build` (requires Docker Desktop).
5. Open http://localhost:3000. Backend health: http://localhost:8000/health.

## Key functionality
- Real alert counts/timeline (no fabricated live packet traffic); use Test Detection (Simulated) button to add a labeled synthetic alert.
- Authenticated CSV report download; logged-in user can export owned alerts. Admin sees all.
- Profile edit with case-normalized unique username (3–32 characters), backend database unique constraint.
- Data & Privacy history deletion removes only user-owned alerts; preserves audit records.
- Admin panel for existing admins to change roles. **New registrations always receive analyst**.

## First admin (manual and trusted operator only)
Once you have independently verified that you own the account, use a privileged database-console connection (never public registration or a frontend-only flag) to assign the initial administrator:
`UPDATE users SET role = 'admin' WHERE email = '<verified-account-email>';`
Restart the session by logging out and back in. Do not execute this for an unverified account. For production, use auditable migration/administrative provisioning instead of manual SQL.

## Limitations
This is NOT real wire-level traffic capture. Connect an authorized sensor to report actual traffic and intrusion signals. The Test Detection button creates database records only, not network attacks. User history deletion covers owned alerts, not shared events or security audit logs. Existing demo settings/MFA screens may still contain unfinished functionality; do not treat them as security controls without further work.
