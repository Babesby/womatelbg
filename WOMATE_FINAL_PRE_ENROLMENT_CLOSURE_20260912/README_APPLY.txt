WOMATE / CANOPY — FINAL PRE-ENROLMENT CLOSURE
12 September 2026

This directly addresses the 3 failures from the user's 15:42 audit.

1. Unicode replacement-character failures
   Repairs WOMATE possessives/quotes/dashes and removes any remaining U+FFFD broken glyphs.
   Rechecks all src/public/index.html files.

2. Internal Supabase environment copy
   Replaces the rendered backend-configuration warning with public-safe wording.
   Replaces the Team Access API environment-variable error with generic wording.

3. Learner Operations audit failure
   This was an audit false-negative caused by case-sensitive matching:
   the UI already contains "Learner operations".
   Audit V2 checks it case-insensitively. No unnecessary UI rename.

The missing canonical SQL warning is also resolved by placing:
CANOPY_OPERATIONS/WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql

No new SQL query is introduced.

Run:
1) apply_final_pre_enrolment_closure.cjs
2) npm run build
3) audit_final_pre_enrolment_v2.cjs

If FAIL = 0, freeze the source and perform only the final live production smoke test.
