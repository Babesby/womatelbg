# WOMATE Canopy — 2027 Africa & Asia release readiness
Status: **development, not authorized for production deployment**.
Source of truth: the `canopy_programme_cohorts` database, subject to formal programme approval.
2026 Cohort 2 remains the visual, navigation and operational reference. No 2026 data is migrated into 2027.

## Testing identities and boundaries
| Identity | Scope | Required verification |
| --- | --- | --- |
| WOMATE admin | Select Africa C3 and Asia C1 independently | No cross-cohort data bleed; selection, seat counts, mail queue, reviews, attendance and certificates work |
| Abena learner | Active Africa C3; later an additional explicitly approved Asia C1 membership | My Cohort switcher shows only own memberships; progress, submissions and feedback stay separated; no automatic enrolment |
| Canopy Tester | 2026 and both 2027 programmes | May explore every module/read-only preview irrespective of dates; must not persist lesson progress, grades, submissions, attendance or certificates |

No Abena memberships were created or updated by this development change. Verify exact account identity in the administrator UI before adding a membership.

## Dates and status — reconcile before public launch
- Asia: applications configured **1 January–15 February 2027**; decisions target **22 February**; orientation **1 March**; first of five teaching weeks **8 March**; target graduation **12 April**.
- Africa: applications configured **10–20 September 2027**; decisions target **26 September**; orientation **4 October**; first teaching week **11 October**; target graduation **15 November**.
- Both are currently in `planning`, and the admissions `is_open` flags are false. The launch owner must confirm all dates, faculty, regional timezone and WhatsApp/YouTube instructions before enabling applications.
- Older planning references describing Asia applications in March/April conflict with the configured March teaching period and must not control the live application date.

## P0 — before first genuine learner is admitted
- [ ] Confirm approved official dates and enable admission gates only after final signoff
- [ ] Verify selected email from `womatead@gmail.com` on Gmail and mobile clients using RFC-2047 subject and UTF-8 MIME bodies; no mojibake
- [ ] Check email congratulations hero in Gmail, Outlook, mobile (AVIF email-image support requires fallback JPEG/PNG)
- [ ] Test selected -> private scratch link -> code reveal -> seven-day personalized expiry -> accept/decline -> Canopy onboarding, plus expired/revoked/wrong-code cases
- [ ] Verify applicants cannot reapply multiple times or consume seats without valid accepted offers
- [ ] Check Africa & Asia capacities, review rubric, waitlists, promotion, and batch-specific acceptance windows
- [ ] Admin can securely add Abena to Africa and, later, Asia (same user, separate memberships). No accidental pre-enrolment
- [ ] Learner switcher shows only authorized active/pending memberships; no 2026 data leakage
- [ ] Canopy Tester can preview all weeks without writes, even with crafted direct API requests
- [ ] Ensure new 2027 curriculum does not mark progress or grant certificates for 2026 lessons

## P1 — learner learning journey
- [ ] Welcome/onboarding and learner profile completion, clear start date and region-specific timezone
- [ ] Five published modules; 20 polished lessons; one applied assignment per module; references and accessibility review
- [ ] Lesson save progress: loading feedback, retry, offline/slow network, no false completion
- [ ] Knowledge checks: distinguish optional ungraded practice from any recorded competency; decide whether to persist scores
- [ ] Assignment drafting/autosave, character guidance, file/evidence attachments, safe submission, revision history and deadlines
- [ ] Learners receive actionable teacher feedback and see the latest review state and next action
- [ ] Mobile and low-data usability, text resizing, keyboard navigation, screen reader clarity and network interruptions
- [ ] Programme timetable: speakers, hosts, meeting links, timezone conversion, recordings, reminders and attendance rules
- [ ] Dashboard progress, missed tasks, notifications, help, resources and opportunity pathways
- [ ] Eligibility dashboard uses approved lessons + assignments + attendance; manual certificate approval and signed link

## P1 — administrator and team operations
- [ ] Preserve full 2026 sidebar sections and controls, adapting cohort data rather than redesigning navigation
- [ ] Selector isolates every operational view and bulk action by the chosen cohort
- [ ] Application scoring, reviewer notes, selections, waitlist, rejections, offer-codes and audit trails
- [ ] Capacity dashboard, response windows, pending acceptances, reminders, suppression/duplicates and mail reconciliation
- [ ] Manage cohort learner membership, withdrawals, reactivation, teaching staff roles and permissions
- [ ] Assignment review queue: filters, rubric 0–100, revisions, feedback, export and bulk actions
- [ ] Attendance: verified sessions, date/time, manual correction audit and learner-visible totals
- [ ] Communications: role-scoped notices, reminders, complaints, warnings and incomplete profile prompts
- [ ] Graduation and signed certificate workflow, eligibility override reasons, record keeping and graduate registry
- [ ] Reports and analytics: clean per-cohort counts, progression, submissions and completion rates, no placeholder statistics
- [ ] Talent Discovery / Missions / Funding / Canopy Spotlight: confirm which are global, which are cohort-scoped, and who can edit

## P2 — polish, operational resilience and handover
- [ ] Consistent empty/loading/error states, no dead links or unimplemented buttons
- [ ] Accessibility, screen sizes (320px–desktop), reduced motion, focus management and contrast
- [ ] Query performance, caching, pagination, session refresh and recoverable errors for 1,000 learners
- [ ] RLS/RPC security tests for cross-cohort access and tester escalation, audit logs and secret hygiene
- [ ] Data backups, migration rollback plan, monitoring, Gmail throttling (200/day), failed-job alerts
- [ ] Regional QA of examples, language, climate information, dates and live-event communication
- [ ] Admin runbook, facilitator onboarding, learner FAQ, escalation paths and simulated launch rehearsal

## Release protocol — conserve Vercel deployments
1. Develop only in `womate-work`; avoid automatically deploying development branches.
2. Static checks / GitHub Actions UI build before review; do not deploy just to check each tiny change.
3. Review the three test accounts and verify migrations/RPCs in a controlled environment before production activation.
4. Batch approved changes into a **single squash/release commit** on `main` with explicit authorization.
5. Deploy once; verify Vercel status and critical user journeys; record any rollback procedure.
