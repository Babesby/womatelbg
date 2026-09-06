# WOMATE Canopy assignment review fix

Run `WOMATE_CANOPY_ASSIGNMENT_REVIEW_AND_NOTIFICATION_FIX.sql` once in the Supabase SQL Editor.

Fixes:
- manual WOMATE review no longer writes `completed` into the constrained submission `status` field;
- completed maps to `status=satisfactory` + `assessment_status=completed`;
- revision maps to `status=revision_requested` + `assessment_status=revision_required`;
- final score, band and feedback stay together;
- manual review sends the authoritative final score to learner notifications;
- tester score notifications are reconciled to the score currently stored on the submission;
- future score changes keep the tester notification synchronized automatically.
