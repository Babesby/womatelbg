WOMATE CANOPY — UNIFIED 2026 COURSE

Purpose
-------
Fixes the split-course problem created when the new curriculum was mounted as a separate Course UI.

After this patch:
- There is ONE 2026 course source.
- The old Canopy organization/flow is restored:
  Home -> Course overview -> locked/open module -> lesson sidebar -> intro video -> lessons -> knowledge check -> assignment.
- The NEW 2026 curriculum content is used everywhere.
- Public landing module preview uses the same new course.
- Learner Home uses the same new course.
- Progress uses the same new course.
- Assignments use each new module's actual paragraph prompt and CanopyCanvas brief.
- Exact programme timing is preserved:
  Monday module/assignment opens
  Thursday speaker challenge unlocks
  Sunday due
  Wednesday resubmission cutoff
- Future assignments remain hidden until their Monday opening.
- Future course modules remain visible but locked, with an opening date.
- Module video is embedded at the start of the first lesson using:
  VITE_CANOPY_VIDEO_MODULE_1
  VITE_CANOPY_VIDEO_MODULE_2
  VITE_CANOPY_VIDEO_MODULE_3
  VITE_CANOPY_VIDEO_MODULE_4
  VITE_CANOPY_VIDEO_MODULE_5
  Existing alternative VIDEO_ID env names are also supported.
- Manager/admin routes are not redesigned or replaced.
- No npm install is needed.
- No Supabase query is required for this content/flow repair.

Run the patch from the WOMATE project root, then run npm run build.
