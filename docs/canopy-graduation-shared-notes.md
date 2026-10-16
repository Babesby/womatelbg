# WOMATE Graduation — Persistent Shared Notes (2026)

The tester's old temporary SAMPLE quote and fake `setData` submission have been removed.

## Database change required

Apply `supabase/migrations/20261016182000_canopy_graduation_notes_persistence.sql` to the production Supabase database using your established migration workflow. **Merging GitHub/Vercel code alone does not run this SQL.**

The migration reuses existing `canopy_graduation_2026_reflections` and the existing admin hidden/visible moderation table. The database verifies the designated test account by `auth.users`; clients cannot grant themselves tester privilege. Normal Cohort 2 learners still cannot open graduation or publish before 29 October 2026 and still need admin graduation approval, a certificate, and active enrollment.

The old sample quote disappears. A tester's new published note is a real shared note: it persists after refresh and becomes visible to all graduation-eligible participants at release. Only one latest note per account is stored (subsequent submissions update the same note). Administrators can hide notes through the existing moderation tools.

## Verification

1. Apply the migration first or immediately after deploying the website update.
2. Sign in as the existing authorized Canopy Tester, open Graduation and post a new note of at least 30 characters.
3. Refresh: the note must remain visible. Open a second signed-in tester browser session: the same note must appear.
4. A regular learner account should remain graduation-locked before 29 October 2026; attempts to call `canopy_graduation_2026_submit` early should be rejected by Supabase.
5. Once graduation opens, an eligible learner should see the tester note plus any other visible published notes. Hide the tester note using the existing admin moderation tool if it should not be shown at graduation.

There are no new image uploads, new public table grants, or Vercel environment variables required for this change.
