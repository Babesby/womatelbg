WOMATE CANOPY — FULL TEAM WORKSPACE PREVIEW
9 September 2026

WHAT THIS FIXES
Admin Role Preview previously showed only each role's home dashboard snapshot.
This patch makes the preview show the actual role-specific sidebar/navigation and lets Admin move through each workspace page.

ROLES
- Programme & Monitoring Manager
- Programme Operations Deputy
- Learning Experience Coordinator (module-bound)
- Learning Experience Fellow (module-bound)

SECURITY
- Preview remains Admin-only.
- Preview is read-only.
- No Team Access Code is consumed.
- No impersonation is performed.
- Existing final-grading / certificate / team-access authority is not widened.
- Coordinator and Fellow remain limited to their assigned module.

FILES INSTALLED
src/canopy/CanopyStaffWorkspace.jsx
src/canopy/canopyStaffWorkspace.css
CANOPY_OPERATIONS/WOMATE_CANOPY_STAFF_WORKSPACE_PREVIEW_20260909.sql

The installer patches only the authenticated team-routing area of src/canopy/CanopyApp.jsx.

AFTER INSTALL
1. npm run build
2. Run CANOPY_OPERATIONS/WOMATE_CANOPY_STAFF_WORKSPACE_PREVIEW_20260909.sql once in Supabase SQL Editor.
3. npm run dev
4. As Admin open /canopy/manage/role-preview and test all four roles.
