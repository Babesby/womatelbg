# WOMATE Canopy — Team Status, Course & Operations Brief

**Release:** She Leads Climate Mentorship · Cohort 2 · 2026 launch candidate  
**Prepared:** 4 September 2026  
**Participant access target:** **20 September 2026**  
**Module 01 opens:** **21 September 2026**  
**First live session:** **24 September 2026, 4:00 PM GMT**  
**Graduation / cohort close:** **5 November 2026**

## 1. Executive status

Canopy is now in **launch-candidate / controlled end-to-end test** status. The core learner experience, cohort gating, course delivery, assignment workflow, automated formative assessment, WOMATE manual review, notifications, Help/complaints, CanopyCanvas, progress, resources and manager certificate issuance are implemented in the launch package.

The platform should **not be described internally as 100% production-ready until the final live test passes** against the production Supabase/Vercel configuration. The remaining work is validation, not a new feature build.

The participant-facing access date is now **20 September 2026**. Access and course pacing are separate: selected learners may enter Canopy from 20 September, while Module 01 remains locked until **21 September 00:00 GMT**. This preserves the existing paced module schedule.

## 2. What Canopy contains

### Learner workspace

- Secure Supabase sign-up, email confirmation, sign-in, password recovery and session refresh.
- WOMATE-controlled cohort activation. Learners cannot self-activate.
- Home / learning dashboard with the next available lesson and paced-module status.
- Course area with five integrated learning modules and 20 lessons.
- Lesson completion tracking and module knowledge checks.
- Weekly paced assignments with up to three attempts.
- CanopyCanvas campaign builder.
- Progress page based on current weekly assignment records rather than obsolete legacy submissions.
- Resources library.
- Real in-platform Notifications plus navbar bell and red unread count.
- Profile.
- Help page for submitting complaints directly to WOMATE.
- Certificate area for real manager-issued Google Drive completion certificates.

### WOMATE manager/admin workspace

- Operations overview.
- Manage cohort / activate or pause learner access.
- Assess submissions.
- Automated formative baseline scoring across weekly submissions.
- Manual score, feedback and decision override for any submission.
- Warnings & feedback.
- Reminders as a separate operational workstream.
- Complaints: receive learner complaints, respond and resolve.
- Certificates: issue a real certificate record from a viewable Google Drive certificate link.
- Reports / operational counts.
- Manager notification bell for new in-platform notifications.

## 3. Current course architecture in Canopy

Canopy currently uses **5 integrated modules / 20 lessons**. The platform keeps the agreed weekly opening schedule and combines leadership/career progression within Module 05.

### Module 01 — Understanding Climate Change
**Opens:** 21 Sep 2026  
**Live expert:** 24 Sep 2026  
**Assignment due:** 27 Sep 2026  
**Revision window:** to 30 Sep 2026

1. Weather, climate and a changing system
2. Drivers, greenhouse gases and impacts
3. Risk: hazard, exposure and vulnerability
4. Mitigation, adaptation and resilience

**Purpose:** establish clear climate foundations and the language learners need for the rest of the programme.

### Module 02 — Gender & Climate Justice
**Opens:** 28 Sep 2026  
**Live expert:** 1 Oct 2026  
**Assignment due:** 4 Oct 2026  
**Revision window:** to 7 Oct 2026

1. Climate change is not gender-neutral
2. Resources, livelihoods and adaptation
3. Mobility, care and invisible adaptation work
4. From vulnerability to climate justice

**Purpose:** connect climate impacts to gender, access, equity, resilience and justice.

### Module 03 — Climate Governance & Policy
**Opens:** 5 Oct 2026  
**Live expert:** 8 Oct 2026  
**Assignment due:** 11 Oct 2026  
**Revision window:** to 14 Oct 2026

1. Governance: more than government
2. UNFCCC, Paris Agreement and NDCs
3. From policy text to implementation
4. Finding your entry point

**Purpose:** show how climate decisions are made and where young women can participate meaningfully.

### Module 04 — Climate Advocacy & Digital Innovation
**Opens:** 12 Oct 2026  
**Live expert:** 15 Oct 2026  
**Assignment due:** 18 Oct 2026  
**Revision window:** to 21 Oct 2026

1. Awareness is not the same as advocacy
2. Evidence → insight → message → action
3. Audience, tone and responsible storytelling
4. CanopyCanvas and campaign measurement

**Purpose:** turn evidence into credible communication, responsible digital advocacy and measurable action.

### Module 05 — Leadership & Professional Pathways
**Opens:** 19 Oct 2026  
**Live expert:** 22 Oct 2026  
**Assignment due:** 25 Oct 2026  
**Revision window:** to 28 Oct 2026

1. Leadership without waiting for permission
2. Finding your professional pathway
3. Your evidence-based leadership story
4. The 90-day Climate Action Note

**Purpose:** bring learning into leadership practice, career direction, networks and a concrete 90-day action commitment.

## 4. Weekly learning and assignment flow

Canopy is cohort-paced rather than fully self-paced.

- **Monday 00:00 GMT:** the module/weekly work opens.
- **Thursday:** the expert session/challenge becomes available in the weekly assignment flow.
- **Sunday 23:59 GMT:** the main submission window closes.
- A short revision/resubmission window follows each week.
- Future modules remain visible but locked until their scheduled opening.
- The dashboard does not route a learner into a future locked lesson after they finish the current open module.

A weekly submission contains three compulsory parts:

1. the written paragraph response;
2. the CanopyCanvas campaign output/link;
3. the Thursday speaker challenge and required LinkedIn URL.

Up to three attempts are supported. Automated grading is a **formative baseline**, not an autonomous certification decision.

## 5. Assessment and review

Automated review runs against current `canopy_assignment_submissions` records. The baseline produces:

- automated score;
- score band;
- feedback hint;
- assessment status.

Current bands:

- **85–100:** Strong
- **70–84:** Satisfactory
- **55–69:** Developing
- **Below 55:** Needs strengthening

WOMATE can manually review **any** submission and replace the baseline with a final score, feedback and decision. Manual review is authoritative. A score below 70 can be marked **Revision required**. Submissions that should not be relied on automatically can be routed to **Needs manual review**.

Learners see the released final/manual score where one exists; otherwise the released automated formative baseline is shown. Review feedback is delivered inside Canopy.

## 6. CanopyCanvas

CanopyCanvas is the built-in campaign creation tool used in weekly work.

Launch configuration:

- message length: maximum 60 characters;
- formats: **Square post** and **Portrait post** only;
- audience, action, tone, background/gradient and texture controls;
- live preview;
- compact Canopy watermark;
- no icon picker;
- no “verified observance” field;
- no landscape-card format;
- generated dimensions: 1200×1200 square and 1080×1350 portrait.

No new AI-generated imagery is required for the launch package. Module visual treatment uses the existing Canopy assets and a deep-green, lime-accent interface with CSS texture/contour treatment.

## 7. Notifications and communication

Canopy notifications are database-backed in `canopy_notifications`.

- Learners have a Notifications page and navbar bell.
- The red badge appears only when unread notifications exist.
- Badge display is capped at `99+`.
- The count refreshes on load, browser focus, visibility return and periodic polling.
- Learners can mark individual notifications or all notifications as read.
- WOMATE warnings, feedback and reminders create learner notifications.
- Assignment manual review creates learner feedback/revision notifications.
- Complaint resolution creates a learner notification.
- Certificate issuance creates/reopens a learner certificate notification.

No email/SMS delivery is claimed by Canopy for these operational messages.

## 8. Help and complaints

Learners can open **Help** from the sidebar and submit a complaint with subject and details. The complaint is stored as a learner-owned operational record and appears under **WOMATE Admin → Complaints**.

WOMATE can add a response and resolve the complaint. The learner can see the complaint history/status and receives an in-platform notification when WOMATE resolves it.

The launch-hardening SQL adds the complaint response fields and tightens RLS so a learner can create only an open complaint for themselves; managers/admins retain operational review rights.

## 9. Certificates

A previous loophole has been closed: certificate issuance now writes to the real `canopy_certificates` table rather than merely creating a manager-action record.

The manager selects the learner and supplies a viewable Google Drive certificate URL. Canopy creates/updates the certificate record and notifies the learner. The learner’s Certificates page then displays the real issued record.

Certificate eligibility remains a **WOMATE manager decision**. Canopy does not autonomously certify participants.

### Important programme-standard check

The approved 2026 programme brief states that certificate eligibility requires attendance at **at least five of the six live learning sessions**, satisfactory completion of required weekly assignments and participation in graduation. Canopy does not yet maintain live Zoom attendance itself, so the programme team must verify attendance from the programme attendance record before issuing a certificate.

## 10. Important programme architecture discrepancy to resolve internally

The **approved She Leads Climate Mentorship 2026 Programme Brief** describes **six live learning sessions / six learning areas**:

1. Climate Change Foundations
2. Gender & Climate Justice
3. Climate Governance & Policy
4. Advocacy, Storytelling, Technology & Communications
5. Leadership & Community Engagement
6. Climate Careers & Professional Pathways

The current Canopy course architecture uses **five integrated modules**, with leadership/community engagement and professional pathways integrated into Module 05. The existing Canopy pacing currently runs through the 22 October Module 05 live point, while the approved brief also lists a separate **29 October Climate Careers & Professional Pathways** session before 5 November graduation.

This package deliberately **does not silently rewrite the current Canopy module schedule**, because the launch instruction is to maintain it. WOMATE’s founders/programme team should make one explicit programme decision before participant onboarding materials and certificate communications are finalised:

- keep the five integrated Canopy modules and treat 29 October as a separate closing/career masterclass/reflection event; **or**
- formally restore a sixth Canopy module/session and align the digital assignment/certificate rules accordingly.

Until that decision is recorded, the programme brief remains the authoritative source for the six-live-session attendance standard, while the digital course remains the current five-module Canopy architecture.

## 11. Data and access model

Core Supabase objects used by the current platform include:

- `canopy_profiles`
- `canopy_enrollments`
- `canopy_cohorts`
- `canopy_lesson_progress`
- `canopy_quiz_attempts`
- `canopy_assignment_schedule`
- `canopy_assignment_submissions`
- `canopy_puzzle_progress`
- `canopy_notifications`
- `canopy_manager_actions`
- `canopy_certificates`
- `canopy_announcements`

Key server-side functions/RPCs include assignment submission, learning automation refresh, manager weekly submission retrieval, manager manual review and real certificate issuance.

Manager/admin permissions are determined from `canopy_profiles.role`. Frontend code uses only the Supabase public/anon key and the authenticated user session. A Supabase service-role key must never be placed in Vite environment variables.

## 12. Production configuration

Before learner onboarding, confirm:

- `VITE_CANOPY_SUPABASE_URL` exists in Vercel Production and Preview.
- `VITE_CANOPY_SUPABASE_ANON_KEY` exists in Vercel Production and Preview.
- Supabase Auth Site URL is `https://www.womate.org`.
- Allowed redirects include `https://www.womate.org/canopy/**`.
- Any Vite environment change is followed by a Vercel redeploy.
- Module intro video environment variables are optional; no module video IDs should be presented as configured unless WOMATE adds them.

## 13. Launch hardening completed in this release

This launch package specifically tightens the following areas:

- participant access copy corrected from 1 October to **20 September 2026**;
- module schedule preserved;
- dark emerald/lime module and lesson visual environment strengthened without generated imagery;
- future-module “continue” routing loophole closed;
- unknown lesson/module routes no longer silently fall back to Module 01;
- last lesson sends the learner to the Knowledge Check;
- quiz-save failures are surfaced rather than swallowed;
- obsolete legacy assignment route/table usage removed from learner progress;
- weekly assignment progress counts modules rather than duplicate attempts;
- assignment clock updates while a page remains open;
- final/manual scores and feedback are shown correctly;
- manager notification route guard corrected;
- unread notification badge strengthened;
- mark-all-read added;
- learner Help/complaint workflow connected to WOMATE admin;
- complaint response/resolution loop completed;
- Reminders separated from warnings/feedback;
- missing learner enrollment can be created through the authorised manager activation flow rather than manual per-user Supabase editing;
- real certificate issuance connected to `canopy_certificates`;
- certificate loading/error states strengthened;
- stale CANTEST, nested Canopy copies and `.bak` files targeted for conservative cleanup;
- a static launch audit is included in the repository package.

## 14. Tomorrow’s controlled test

The final test should be completed with at least one learner account and one manager account.

1. **Authentication:** new learner signs up, confirms email, signs out/in and retains a valid session.
2. **Activation:** WOMATE manager activates the learner without manual per-user SQL editing.
3. **Pending state:** an inactive learner cannot enter scheduled course content but can access Profile, Notifications, Help and Certificates.
4. **Course gating:** future modules remain locked and Module 01 still opens 21 September.
5. **Lesson/quiz persistence:** complete a lesson and knowledge check; refresh/logout/login and confirm progress remains.
6. **Notifications:** send a **new** warning/reminder and verify learner page + red navbar badge. Old warnings created before the notification trigger should not be used as the test case.
7. **Help/complaint:** learner submits complaint → WOMATE sees it → WOMATE responds/resolves → learner sees response/status and receives notification.
8. **Assessment:** use an existing/current test submission to verify automated baseline, manager manual review/override and learner review display. Do not weaken production dates merely to force tomorrow’s test submission window open.
9. **Certificate:** issue a test certificate with an accessible Google Drive link and verify the learner receives the notification and certificate record.
10. **Mobile:** verify sidebar, top notification bell, lesson reading, assignments, Canvas, Help and certificate page on a phone-sized viewport.
11. **Production configuration:** confirm Vercel environment variables and Supabase auth redirect settings.
12. **Build/deploy:** production build must pass; after push, wait for Vercel to report Ready before testing the production URL.

## 15. Current release judgement

**Code status:** launch candidate.  
**Database status:** requires the included launch-hardening SQL once before the final test.  
**Participant access target:** 20 September 2026.  
**Module schedule:** retained.  
**Major feature development:** should stop after this release; only defects found during the controlled test should be changed before learner onboarding.

The remaining “100%” milestone is therefore evidence-based: **successful SQL update + successful production build + successful learner/manager end-to-end test**.

## 16. Current Canopy source inventory

The launch package intentionally keeps the live Canopy implementation compact. The following source files are the active Canopy application set:

| File | Purpose | Launch status |
|---|---|---|
| `src/canopy/CanopyApp.jsx` | Public Canopy landing, auth, learner/manager routing, course/lesson/quiz shells, learner Help and manager operations | Active / tightened |
| `src/canopy/CanopyAssignmentsV2.jsx` | Current paced weekly assignment experience, resubmissions, score/feedback display and puzzle | Active / current |
| `src/canopy/CanopyCanvas.jsx` | CanopyCanvas campaign builder and downloadable campaign graphic | Active / current |
| `src/canopy/CanopyCertificate.jsx` | Learner certificate retrieval and display | Active / tightened |
| `src/canopy/CanopyNotifications.jsx` | Notification centre, individual read state and mark-all-read | Active / tightened |
| `src/canopy/canopy.css` | All scoped Canopy presentation, responsive layouts and green course/module environment | Active / tightened |
| `src/canopy/canopyApi.js` | Supabase Auth/REST/RPC integration | Active / tightened |
| `src/canopy/canopyCurriculum2026.js` | 2026 curriculum content, checks, cases, assignments and authoritative learning references | Active / current source |
| `src/canopy/canopyData.js` | Adapts the 2026 curriculum into the live course UI and resource list | Active / current |
| `src/canopy/canopySchedule.js` | Participant access date and exact weekly module/assignment schedule | Active / launch schedule |

### Canopy assets retained

`public/assets/canopy/` remains the production asset location for the supplied Canopy logo, authentication background and approved Canopy preview imagery. The launch cleanup deliberately does not delete it.

### Files/folders treated as obsolete

The cleanup script targets only known non-production remnants: `src/cantest`, the obsolete nested `src/canopy/canopy`, known old Canopy patch/audit staging folders and `.bak` / `before-*` files inside `src/canopy`. It deliberately avoids broad deletion patterns.

### Repository support files in this release

- `CANOPY_TEAM/WOMATE_CANOPY_TEAM_STATUS_AND_OPERATIONS.md` — this team/founder brief.
- `CANOPY_TEAM/WOMATE_CANOPY_LAUNCH_HARDENING_2026.sql` — one-time Supabase launch-hardening follow-up.
- `CANOPY_TEAM/audit_canopy_launch.cjs` — static release checks.
- `CANOPY_TEAM/cleanup_canopy_stale.cjs` — conservative obsolete-file cleanup.
- `CANOPY_TEAM/README_APPLY.md` — local apply/build/push instructions.
