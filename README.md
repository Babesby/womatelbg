# WOMATE Canopy classroom + Google Auth repair

Fixes:
- classroom blank-screen runtime regression caused by `canopyModulesOpen` reference
- adds Google OAuth button to Canopy login/signup
- Google returns to `/canopy/auth/callback`
- keeps email/password auth
- keeps 20 September learner access and existing five-module schedule

Required Supabase/Google configuration is described in the ChatGPT response.

## 2027 cohort administration release

The Africa Cohort 3 and Asia Cohort 1 administration refresh was merged in commit `5cedcc3177c6cea9a5e8502b23efa302051dd1ae`. This documentation-only update requests a new production deployment after the earlier Vercel daily-limit failure. No application code is changed by this commit.
