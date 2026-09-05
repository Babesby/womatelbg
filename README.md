# WOMATE Canopy classroom + Google Auth repair

Fixes:
- classroom blank-screen runtime regression caused by `canopyModulesOpen` reference
- adds Google OAuth button to Canopy login/signup
- Google returns to `/canopy/auth/callback`
- keeps email/password auth
- keeps 20 September learner access and existing five-module schedule

Required Supabase/Google configuration is described in the ChatGPT response.
