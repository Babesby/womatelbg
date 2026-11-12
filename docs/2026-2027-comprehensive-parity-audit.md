# WOMATE — 2026 Cohort 2 → 2027 Africa/Asia Architecture Audit
**Release rule:** Cohort 2 (2026) is the master functional architecture. Reuse its components and interactions; preserve its data and history. Customise only cohort identity, modules, lesson material, practical and speaker assignments, regional dates, weekly speaker assets and approved regional communications. A successful build is NOT proof of end-to-end parity.

**Checked against:** `src/canopy/CanopyApp.jsx`, `CanopyAssignmentsV2.jsx`, `CanopyExperience.jsx`, `CanopyCelebration2026.jsx`, `CanopyGraduationPortal.jsx`, `CanopyCertificate.jsx`, `Canopy2027Learning.jsx`, `Canopy2027AdminWorkspace.jsx`, `canopyApi.js`, `canopyLearningApi.js`, `AskCanopyWidget.jsx`, existing Supabase RPCs and 2027 staged migrations. Revised 12 November 2026.

Status: **Shared** = same global component/route, must test scoping. **Implemented** = new code exists, still requires live acceptance. **Partial** = different or missing controls. **Not verified** = needs real user/role testing. **Held** = awaiting approved content/speaker assets.

## Learner features — checked one by one
| 2026 Cohort 2 functionality | 2027 state | Next action |
| --- | --- | --- |
| Brand and full left navigation | Shared | Screenshot compare Africa/Asia and mobile |
| Welcome dashboard / progress ring | Partial | Refactor 2027 Home to reuse all 2026 dashboard components, not just summary cards |
| This Week panel and weekly unlock | Partial | Module dates exist; exact 2026 animations and speaker unlock chronology need testing |
| Speaker graphics on new week | Held | Insert user-supplied assets only; no invented art |
| Five modules, 20 lessons, separate curriculum | Implemented | Editorial review of all 40 regional lessons |
| 2026 activity experiences / interactive tasks | Partial | Verify and map every 2026 activity to the equivalent 2027 lesson |
| Knowledge checks, feedback sounds | Implemented | Correct/incorrect outcomes, restart, reduced motion |
| Three-part assignments | Implemented in development | Apply versioned RLS drafts/submission migration before frontend release |
| Draft saving / zero attempts | Implemented in development | Verify persistence, reload, failure/retry |
| Practical evidence upload / Drive-link checks | Partial | 2027 currently accepts HTTPS evidence links; 2026 Drive verification and role-specific guidance need parity |
| Speaker challenge unlock | Implemented in development | Publish real speaker unlock timestamp and instructions before opening final submit |
| Three attempts, resubmission & grace windows | Partial | Three attempts staged; 2026 extension/grace workflows and notification rules not fully ported |
| Manual scoring 0–100 and personal remarks | Implemented | Test reviewer RPC and filtered queue |
| Score bands and result archive with GIFs | Partial | 2026 result GIF reused, score-band/remarks UX requires full real-data comparison |
| Attendance & weekly reminders | Partial | 2027 attendance RPC exists; session metadata, accurate reminders and manual audit require parity |
| Mission hub & cross-country missions | Shared/partial | Current 2027 Missions route is not complete 2026 mission launch/assessment journey |
| Impact profile & portfolio evidence | Partial | 2027 displays summary rather than full 2026 portfolio artifacts |
| Opportunities board | Shared | Verify cohort-based eligibility/no 2026 data leakage |
| Funding and paid work | Shared | Verify access/permissions/graduate funding pathway |
| Talent Discovery | Shared | Verify graduate listing eligibility and safety oversight |
| CanopyCanvas | Shared | Verify 2027 assignment connections |
| Resource library | Shared | Remove outdated 2026 dates and expired resources from 2027 context |
| Notifications | Shared | Verify 2027 assignment, attendance, graduation and opportunity notices |
| Ask Canopy AI-style guide | Implemented | 2027 region-aware answers; verify every 2026 topic and future speaker date handling |
| Help and complaints | Shared | Verify 2027 complaint routing and staff response |
| Profile/account settings | Shared | Verify correct two-cohort membership display and certificate name locking |
| 2026 graduation animations and dance | Implemented in 2027 ceremony | Full visual and no-write tester QA needed |
| Graduation portrait removal/cap/editor/download | Shared reusable 2026 component | Verify 2027-specific class label, mobile and media assets |
| Graduation wall/reflections | Implemented in 2027 migration | Approvals and moderation must be tested |
| Graduation eligibility | Fixed in staged migration | Use 20 lessons + 5 approved assignments + 5 sessions + code + manual approval, not old 10/3/3 |
| Certificate issuance + registry | Partial | Cohort-scoped issuance RPC and eligibility fix staged; verify authenticated download |
| Post-graduation check-ins | Implemented for verified 2026 and 2027 graduates | Reuses 2026 quarterly form with expanded verified graduate RLS; role acceptance test still required |
| Graduate opportunity announcement and application | Implemented | Test graduate-only gate, one-time notification, consent, admin curation |
| Selection-code image maker, photo & sharing | Implemented | Africa and Asia regional cards; 2026 original preserved |
| Offer acceptance + scratch reveal | Implemented | Africa cohort trigger extension staged, e2e expiry and identity checks |

## Administrator features — checked one by one
| 2026 feature | 2027 state | Next action |
| --- | --- | --- |
| Full programme operations navigation | Shared | Exact screenshot/routing regression |
| Operations overview | Partial | 2027 has dedicated summary, not all Cohort 2 data cards/actions |
| Manage cohort/withdraw/restore | Implemented | Verify exact learner permissions and audit trail |
| Assess submissions and feedback | Implemented/partial | Reviewer field fix staged; 2026 reviewer controls/filters need QA |
| Warnings & feedback | Shared/partial | Verify cohort-specific warning recipients and no 2026 leakage |
| Reminders and delivery batching | Shared/partial | Test real cohort targeting, rate limits and queued mail |
| Complaints | Shared/partial | Confirm 2027 filters, responses and resolution |
| Attendance | Implemented | Validate correction audit trail and session date |
| Certificates | Implemented/partial | Fix 10/3/3 approval and issuance gates, review criteria |
| Graduate registry | Shared/partial | Verify 2027 IDs, not just 2026 registry |
| Alumni check-ins | Shared/partial | Adapt 2027 alumni status/retention |
| Graduation ceremony and moderation | Implemented in development | Separate 2027 approvals/reflections, same 2026 media |
| Inactivity review | 2026-only / partial | Build cohort-aware inactivity detection and escalation |
| Reports and evidence exports | Partial | 2027-specific report exists; compare all 2026 metrics/exports |
| Opportunities | Shared | Cohort scoped |
| Funding & paid work | Shared | Cohort scoped |
| Talent directory and approvals | Shared | Graduate eligibility audit |
| Mission groups | Partial | 2027 resource list, not full 2026 mission operations |
| Collaboration management | Shared | Verify cohort scope |
| Deals, invoices & reports | Shared | Verify earnings and commercial oversight |
| Canopy Spotlight | Shared/partial | Confirm 2027 submission and recognition sources |
| Team Access | Shared | Staff role tests for 2027 |
| Selection codes | Shared | Test creation and recipient mapping for both 2027 cohorts |
| Courses & Expert QA | Shared | Programme vs course isolation |
| Native applications, scoring and selection | 2027 enhancement | Test review rubric, scratch cards, acceptance and waitlist |
| Graduate placement interest management | Implemented | Consent-only export, review, host assignment, no auto-share |

## Test identity matrix
- **Abena (learner):** verify actual identity before authorising Asia 2027 membership. Test 2026/Africa/Asia scoping, drafts, feedback, certificates.
- **Canopy Tester:** existing 2026 plus both 2027 cohort dropdowns; read-only 2027 admin preview; graduate interest preview; no RPC writes.
- **Administrator:** 2026 operations retained; Africa/Asia selectors; independent reviews, graduation, placement curation and reports.

## Release blockers
1. Apply and verify staged RLS drafts/submissions migration, graduation parity, selection scratch extension and graduate opportunities schema before frontend release.
2. Run Vite compile and static checks in GitHub Actions with zero Vercel deployments.
3. Validate authenticated database calls as real graduate, non-graduate, tester and admin (including direct RPC privilege escalation and cross-cohort cases).
4. Complete 2026-to-2027 parity for partial functions listed above; where unverified, do not claim complete.
5. Confirm official module dates and actual speaker/week metadata; no placeholder graphics/links.
6. Deploy in one squashed `main` commit after approved release; monitor Vercel and worker, with rollback plan.

## Important policy
BTS Ghana is the first host arrangement reported by WOMATE. **Do not claim any other organisation has agreed to host graduates.** Never disclose profiles without explicit consent, human curation, host verification and suitable project terms. Remote placements should specify duration, supervision, compensation or reimbursement, expected deliverables and safeguards.

## Latest release audit hardening
- Manual reviewer scores: no implicit 80/100 defaults; reviewers enter 0–100 deliberately and provide meaningful remarks.
- Practical and speaker evidence: separately visible to reviewers.
- Attendance copy: graduation requires the cohort-configured attendance count, not the outdated three-session statement.
- Original quarterly alumni check-in: server gate extended to future certified 2027 graduates; tester gets preview only with submission disabled.
- Admissions metadata: fixed descriptions to match configured Africa/Asia 2027 application and module dates without opening applications.

**QA limits:** passing GitHub compilation and SQL rolled-back role tests do not prove all Cohort 2 interactions or photograph-related browser flows work across every device. Explicitly test with Abena, Canopy Tester and the authorised administrator. Speaker graphics, actual speaker challenge unlock dates and host confirmation remain unavailable until supplied/approved.
