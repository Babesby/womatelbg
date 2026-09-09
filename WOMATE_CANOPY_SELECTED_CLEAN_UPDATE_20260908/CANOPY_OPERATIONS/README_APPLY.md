# WOMATE Canopy operations master — 8 Sep 2026

Canonical database operations file:
`WOMATE_CANOPY_MASTER_2026.sql`

This version includes the 8 Sep 2026 access-code fix: PostgreSQL built-in `md5()` plus `gen_random_uuid()` are used instead of `digest()` / `gen_random_bytes()`.

Run the whole SQL file once in Supabase SQL Editor when you intentionally want to apply the database update. Deleting old SQL Editor tabs does not undo already-applied database changes.
