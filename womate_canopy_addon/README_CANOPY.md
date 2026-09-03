# WOMATE Canopy addon

Canopy is an isolated learning application added alongside the existing WOMATE public website. The existing Home, She Leads, WoK Action, Circle, Research, Resilient Minds, Honours, Leadership, Funding, WOMATEER and Merchandise pages are not redesigned or replaced.

## Routes
- `/canopy` — public learning-environment introduction
- `/canopy/login` — participant sign in
- `/canopy/signup` — learning account creation
- `/canopy/classroom` — authenticated learner home
- `/canopy/course/she-leads` — She Leads course
- `/canopy/course/she-leads/:module/:lesson` — lesson reader
- `/canopy/course/she-leads/:module/quiz` — knowledge check
- `/canopy/assignments` — practical assignments
- `/canopy/progress` — progress record
- `/canopy/resources` — external learning references
- `/canopy/profile` — learner profile
- `/canopy/manage` — manager/admin cohort snapshot

## Name
**WOMATE Canopy**
Tagline: **Learn climate. Grow leadership.**

## Backend setup
1. Create/use a Supabase project.
2. Run `supabase-canopy.sql` in the Supabase SQL Editor.
3. Add these environment variables locally and in Vercel:

```env
VITE_CANOPY_SUPABASE_URL=
VITE_CANOPY_SUPABASE_ANON_KEY=

# Unlisted YouTube video IDs — use only the ID, not the full URL
VITE_CANOPY_VIDEO_MODULE_1=
VITE_CANOPY_VIDEO_MODULE_2=
VITE_CANOPY_VIDEO_MODULE_3=
VITE_CANOPY_VIDEO_MODULE_4=
VITE_CANOPY_VIDEO_MODULE_5=
```

## Enrolment model
Creating an account does **not** automatically grant course access. Selected participants must have an `active` record in `canopy_enrollments`. This preserves She Leads admission control.

To make a WOMATE staff account a manager/admin, change `canopy_profiles.role` in Supabase to `manager` or `admin`.

## 2027 course structure
The v1 course is deliberately foundational and follows the approved She Leads learning architecture:
1. Understanding Climate Change
2. Gender & Climate Justice
3. Climate Governance & Policy
4. Climate Advocacy & Digital Innovation
5. Leadership & Professional Pathways

Each module includes short lessons, one YouTube masterclass slot, a knowledge check and an applied assignment. Module 5 closes with the 90-day Climate Action Note.

## Files added
- `src/canopy/CanopyApp.jsx`
- `src/canopy/canopyData.js`
- `src/canopy/canopyApi.js`
- `src/canopy/canopy.css`

Only two changes are made to the supplied `src/main.jsx`:
1. import `CanopyApp`
2. route `/canopy*` into the isolated learning application before the normal WOMATE header/footer are rendered.
