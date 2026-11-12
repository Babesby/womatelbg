# WOMATE — STRICT COHORT 2 (2026) PARITY CONTRACT FOR 2027
**Status:** implementation in progress; not a claim that feature parity is finished.
**Production:** DO NOT DEPLOY without the user's explicit approval; develop on `womate-work`, batch into one release.
**Binding rule:** Cohort 2 is the literal master for learner/admin UX, states, progression logic, feedback, graduation and integrations. Avoid inventing a new 2027 design or reducing 2026 behaviors.

## The only permitted cohort-dependent differences
1. Programme identity / cohort labels: Africa Cohort 3 or Asia Cohort 1 (2027); never show Cohort 2 labels in a 2027 learner screen.
2. The five module titles, lesson content, activities, readings, assignments, questions, applied tasks and speaker challenges, using the approved 2027 region-specific curriculum.
3. Approved regional programme timelines, module opening dates, assignment deadlines, session schedules, timezone and graduation date.
4. Weekly home speaker visual, speaker name / bio / session link; the user will supply images later. Leave graphic slot empty until assets are approved.
**Everything else is unchanged in purpose, completeness, UX, data validation, feedback behavior, grading and progression.**

## Canonical 2026 implementations: reuse, do not redesign
| 2026 source | Must be preserved in Africa C3 and Asia C1 |
| --- | --- |
| `CanopyApp.jsx`: `Dashboard`, `TesterDashboard`, `LearnerShell` | Welcome, continuing week, progress ring, weekly content, sidebar, locked states, all dashboard components |
| `CanopyApp.jsx`: `CourseOverview`, `Lesson`, `Quiz`, `Progress` | Module cards, sequenced lessons, navigation, knowledge checks, practice feedback and progression |
| `CanopyAssignmentsV2.jsx` | Full 3-part assignment card and submission paths: paragraph response, practical evidence, speaker challenge; save drafts; upload/viewable evidence links; statuses, due dates, attempts, partial revisions |
| `CanopyAssignmentsV2.jsx` result archive | 0–100 score, score band, personalized manual remarks, reviewer decision, protected completed result, same per-module Giphy celebrations, optional grace evidence rules |
| `CanopyExperience.jsx`, `canopyFeedbackAudio.js` | Activities, puzzles, correct/incorrect sounds, hover and completion delight without overusing popups |
| `canopySchedule.js` | Weekly unlock, speaker unlock after the live session, submission and revision windows, deadlines in the cohort's timezone |
| `CanopyAttendance.jsx`, `CanopyNotifications.jsx` | Session attendance, notices, reminders, pending work, account-specific messages |
| `CanopyCanvas.jsx`, `CanopyPortfolioPage`, `CanopyMissionHub` | Practical portfolio, evidence, mission work and opportunities |
| `CanopyCertificate.jsx`, `CanopyGraduationPortal.jsx`, `CanopyCelebration2026.jsx` | Graduation gates, ceremonial UI/animations, certificate eligibility and delivery, graduate recognition; parameterize year/graphics, never borrow 2026 credentials |
| `CanopyApp.jsx`: `ManagerOperations`, reviews, certificates, reports | Exact 2026 operational sidebar and work areas; assessment queue, rubric, 0–100 reviews, score remarks, attendance, certificate approvals, exceptions, warnings, reminders, complaints, reports, graduates |
| `CanopySelectionCodes.jsx` and `src/selected/*` | Verify selection email and code; generate “I Have Been Selected” personalised photo image; zoom, crop, download, sharing; correct 2027 cohort identity |
| `CanopyHelp.jsx`, `CanopyAlumniCheckin.jsx`, `CanopyProgrammeReport.jsx`, `CanopyTeamAccess.jsx` | Help, completion follow-up, team permissions, oversight and reports |
| `AskCanopyWidget.jsx`, `canopyHelpData.js`, `canopyHelpMatcher.js` | Identical learner-facing Ask Canopy interface; verified replies must use the current cohort's programme dates, module names, assignment and graduation rules rather than leaking Cohort 2 (2026) details |
| Live 2026 communications and management RPCs | Replicate queueing/delivery, reviewer decisions, auditing, permissions and errors with cohort-scoped 2027 tables/RPCs; no copying historical learner data |

## Cohort timeline inputs (the established configured 2027 dates)
| Milestone | Asia C1 | Africa C3 |
| --- | --- | --- |
| Applications | Jan 1–Feb 15, 2027 | Sep 10–20, 2027 |
| Decisions | Feb 22, 2027 | Sep 26, 2027 |
| Orientation / programme open | Mar 1, 2027 | Oct 4, 2027 |
| Module 01 | Mar 8 | Oct 11 |
| Module 02 | Mar 15 | Oct 18 |
| Module 03 | Mar 22 | Oct 25 |
| Module 04 | Mar 29 | Nov 1 |
| Module 05 | Apr 5 | Nov 8 |
| Graduation target | Apr 12 | Nov 15 |
Individual offer acceptance is seven days after the actual official selection email. Do not translate historical 2026 per-person extensions to 2027. Speaker images, live-session timings, assignment grace decisions and final graduation eligibility rules must be copied from the programme operations model and confirmed, not invented.

## Actual 2027 curricula — never display 2026 titles
**Asia C1**
1. Climate risk across Asian communities
2. Gender-responsive resilience & adaptation
3. Regional climate solutions & responsible innovation
4. Governance, finance & public influence
5. Cross-regional leadership & professional pathways

**Africa C3**
1. Climate realities, risk & evidence
2. Gender, justice & inclusive adaptation
3. Climate governance, policy & public voice
4. Community action, innovation & delivery
5. Leadership, collaboration & professional pathways

## Verified gaps at start of parity migration (not completed)
- `Canopy2027Learning.jsx`: new, simpler dashboard vs 2026 `Dashboard` and `CanopyThisWeek` structure.
- `Canopy2027Learning.jsx`: 2027 assignment originally one text field; 2026 has paragraph + practical + speaker task, persisted drafts, manual-review archive, grace rules, revision selection and 2026 UX.
- `Canopy2027Learning.jsx`: 2027 quiz differs in score/feedback/audio detail.
- `Canopy2027AdminWorkspace.jsx`: newer simplified tables differ from `ManagerOperations`, 2026 full sections and review controls.
- Graduation: 2027 certificate page does not yet reproduce 2026 celebration, graduation portal and eligibility/feedback gates.
- Home weekly speaker artwork: 2027 graphic slot is configurable but intentionally empty pending approved images.

## Work started during parity rebuild
- Shared 2026 score archive formatting/remarks and result celebration GIF sequence integrated into 2027 reviewed assignments.
- Restore 2026 “I Have Been Selected” card generator after 2027 scratch reveal; the code serves both generation and offer acceptance.
- Selection-card generator heading reflects verified cohort rather than hard-coding Cohort 2.
- Provide per-cohort speaker graphic slots; no guessed speaker artwork.
These are **initial parity corrections only**, not completion of this contract.

## Mandatory acceptance testing before deploying
**Actual learner (Abena):** lessons/drafts/progress/submit/revise/score/GIF/attendance/certificate; 2027 Asia and Africa separate; 2026 untouched.
**Canopy Tester:** full read-only, open modules, no writes even via direct RPC; journey and feedback examples.
**Administrator:** same 2026 navigation and review depth; manage cohorts distinctly, grade and release feedback, attendance, warnings, complaints, reminders, graduate/certificate decisions.
**Regression:** Cohort 2 screens, scores, access and data must remain unchanged. Backend RLS must reject cross-cohort access. Build UI with Vite and perform test of key routes with screenshots.
**Release:** one Vercel production deployment only once the full 2026 parity checklist passes and user approves.

## 2027 card design deliverables (development)
- Africa C3: WOMATE deep green and lime, rooted concentric editorial line texture, Africa C3/2027 lockup, full-resolution 1080×1080 PNG.
- Asia C1: WOMATE teal and lime, connected-route fine-line texture, Asia C1/2027 lockup, full-resolution 1080×1080 PNG.
- Both reuse the 2026 Supabase-verified code, personal photo, reposition/zoom, local-only browser rendering, download and share operations. Never generate or publish a verified graphic from an unverified name.
- The original 2026 card renderer is the fallback only for 2026 invites; 2027 uses programmeSlug returned by WOMATE's selection-code verification RPC.
- 2027 Ask Canopy response source is `canopyHelp2027.js`, based on `canopyCurricula2027.js` and `canopyCohortRuntime2027.js`. Existing 2026 match logic is unchanged.

## Explicitly NOT completed yet
- Three-part persisted 2027 assignment/draft pipeline is **staged but requires database migration, speaker/deadline configuration, review UX and real-user tests**. It is not live.
- Complete 2027 admin operational parity (warnings, complaints, scores, certificates, graduation audit and other 2026 operations).
- 2027 graduation animated/feedback/certificate flow parity and speaker-specific content.
- End-to-end 2027 role tests for Abena (Africa + Asia), Canopy Tester and admin; production database activation.

These must be implemented and verified before anyone claims full architecture parity. Do not mark the overall 2027 rollout complete because the selection cards or isolated UX components are finished.

## Staged Cohort 2-style assignment integration (do not deploy separately)
- New draft records are keyed by cohort + actual learner + module and RLS-protected; saves do **not** consume attempts.
- The 2027 v2 submission RPC accepts paragraph, practical HTTPS evidence and speaker HTTPS evidence, with a three-attempt maximum and published speaker/deadline gates.
- The 2027 workspace RPC exposes both the published timing fields and separate speaker evidence; the admin workspace includes speaker evidence for review.
- The historic 2027 review implementation incorrectly referenced nonexistent `reviewer_id`; staged SQL updates it to `reviewed_by`.
- This is an architectural staging step, **not parity completion**. The practical and speaker assignments still require approved 2027-specific briefs, live session metadata and end-to-end review/feedback checks. Apply the migration before any frontend release using these RPCs.
