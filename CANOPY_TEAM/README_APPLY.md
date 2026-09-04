# WOMATE Canopy — Launch Tightening Package

This package is the consolidated Canopy launch candidate for **She Leads Climate Mentorship · Cohort 2 · 2026**.

## Apply locally

Extract the ZIP into the WOMATE project root (`C:\phill\wo-web\ww\womate_build`) and run:

```powershell
node .\CANOPY_TEAM\cleanup_canopy_stale.cjs; node .\CANOPY_TEAM\audit_canopy_launch.cjs; npm run build
```

The cleanup is deliberately conservative. It removes only known old Canopy patch/test folders, `src/cantest`, the obsolete nested `src/canopy/canopy`, and `.bak` / `before-*` files inside `src/canopy`. It does **not** delete `public/assets/canopy`, root `assets`, `node_modules`, or `dist`.

## Supabase update — required once

Before the final live test, run `CANOPY_TEAM/WOMATE_CANOPY_LAUNCH_HARDENING_2026.sql` in the Supabase SQL Editor. It completes the learner complaint → WOMATE response → learner notification loop and makes manager certificate issuance write to the real `canopy_certificates` table.

This is a follow-up to the assignment-review/notification migration that already succeeded. Do not paste service-role keys into the frontend or into chat.

## Production configuration to confirm

- Vercel Production and Preview: `VITE_CANOPY_SUPABASE_URL` and `VITE_CANOPY_SUPABASE_ANON_KEY`.
- Supabase Auth Site URL: `https://www.womate.org`.
- Supabase redirect allow-list includes `https://www.womate.org/canopy/**`.
- Redeploy after changing Vite environment variables.

## Git push after a successful build

```powershell
git add src/canopy CANOPY_TEAM; git add -u; git commit -m "feat: harden Canopy for Cohort 2 launch"; git push
```

Do not push until `npm run build` succeeds. The Vite >500 kB chunk message is a performance warning, not a build failure.
