WOMATE CANOPY + SELECTED CLEAN UPDATE — 8 SEP 2026

Run from:
C:\phill\wo-web\ww\womate_build

Command after extracting this ZIP into the project root:
node .\WOMATE_CANOPY_SELECTED_CLEAN_UPDATE_20260908\apply_clean_update.cjs; npm run build

WHAT IT DOES
1. Replaces CANOPY_OPERATIONS/WOMATE_CANOPY_MASTER_2026.sql with the user-updated 8 Sep SQL.
2. Keeps the approved /selected branding refinements (WOMATE colours, mark, Women in Climate, tagline, texture).
3. Removes only known obsolete patch folders and duplicate historical master SQL copies.
4. Removes stale dist/ before the fresh production build.

WHAT IT DOES NOT DELETE
- src/
- public/
- node_modules/
- .env / .env.example
- package.json / package-lock.json
- CANOPY_OPERATIONS/
- WOMATE_SELECTED_CARD_GENERATOR/
- current application data or Supabase records

DATABASE NOTE
The ZIP updates the local canonical SQL file. It does not execute SQL against Supabase. Run the canonical SQL manually in Supabase SQL Editor only when you intend to apply it.
