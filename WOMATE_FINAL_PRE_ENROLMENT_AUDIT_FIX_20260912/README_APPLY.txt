WOMATE / CANOPY — FINAL PRE-ENROLMENT AUDIT + UTF-8 FIX
12 September 2026

PURPOSE
This package runs against the CURRENT source in your local WOMATE project. It does not replace CanopyApp.jsx with an older copy.

WHAT THE APPLY SCRIPT FIXES SAFELY
- Site-wide separator corruption such as:
  Africa � connected globally -> Africa · connected globally
  WOMATE Circle � WhatsApp -> WOMATE Circle · WhatsApp
  02 � DIRECT ACCESS -> 02 · DIRECT ACCESS
- Common UTF-8 mojibake sequences such as Â· / â€” / â€™.
- Ensures index.html has a UTF-8 charset declaration.
- Removes the known internal Coordinator/Fellow operational sentence wherever present.
- Removes “Workspace compatibility mode” copy if present.
- Replaces the public WOMATE Circle fallback that exposed VITE_CIRCLE_WHATSAPP_URL/.env with user-safe copy.
- Re-applies the known Canopy staff refreshKey initialization-order fix only if an older broken pattern is still present.

WHAT THE AUDIT CHECKS
- replacement-character / mojibake corruption across src, public and index.html
- reported WOMATE separator copy
- internal/debug implementation copy
- dead href/javascript:void links
- empty image sources
- unsafe target=_blank links (warning)
- TODO/FIXME/HACK markers (warning)
- Canopy required files, learner routes and auth routes
- four staff role definitions and shared navigation
- Deputy refreshKey crash regression
- participant schedule dates
- 20-lesson curriculum integrity
- assignment review and certificate RPC wiring
- obsolete tester/nested Canopy folders
- canonical Team Readiness SQL presence and required hardening functions

NO NEW SQL QUERY IS CREATED.
Keep using:
CANOPY_OPERATIONS/WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql

After applying:
1. npm run build
2. node .\WOMATE_FINAL_PRE_ENROLMENT_AUDIT_FIX_20260912\audit_final_pre_enrolment.cjs
3. If the audit reports FAIL, send CANOPY_OPERATIONS/WOMATE_FINAL_PRE_ENROLMENT_AUDIT_REPORT.txt.
