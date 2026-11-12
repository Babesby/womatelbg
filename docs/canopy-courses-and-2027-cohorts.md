# WOMATE Canopy 2027 learning expansion — implementation notes

## Separation of programmes
- She Leads Climate Mentorship Cohort 2 (2026): unchanged existing production classroom, assignments, certificate logic and membership data.
- She Leads Africa Cohort 3: `she-leads-climate-c3-2027`, free, mid-September 2027 applications, October 2027 sessions, five teaching weeks.
- She Leads Asia Cohort 1: `she-leads-asia-c1-2027`, free, configured applications 1 January–15 February 2027, cohort orientation from 1 March, five teaching weeks beginning 8 March and graduation target 12 April 2027. Admissions remain closed until deliberately activated.
- Short WOMATE Courses: separate catalogue, 16 lessons and four assessments each in the first two proposed specialist courses. Published publicly as Coming Soon; payment/enrolment disabled.
- Approved Expert Masterclasses: separate private instructor drafts, manual instructor and course reviews, public listing only after approval. Payment/enrolment remain disabled.

## Reused Cohort 2 academic blueprint
- Five cohort modules; four lessons per module = 20 lessons.
- One applied module assignment each = five manually approved assignments.
- Five live session attendance records, marked by WOMATE.
- No automatic certificate for quiz clicks or page views; admin validates requirements, approves eligibility and issues signed external certificate URL.
- Co-hosted regionally relevant contexts are added to cohort reflections; the trusted canonical WOMATE 2026 curriculum remains the starting source. Existing 2026 learner progress is never reused.
- Low-bandwidth text-first lessons, plain-language questions, constructive feedback and revision opportunities respond to participant evaluation.

## Planning evidence
- Programme Evaluation C2: https://docs.google.com/spreadsheets/d/1ocwtvaT5_1DcMoo_YsKzGRDsS51OV15hPk2tGDvBAtg/edit
- 2027 Expression of Interest: https://docs.google.com/spreadsheets/d/1HjDqjYhf1T6BdlOJTpDv00CskPLOl57KSeeJGiRkZUQ/edit
- Read as planning evidence only, NOT as consent to expose applicant names, contact details or raw responses. Neither spreadsheet is modified.
- Qualitative themes: accessible live sessions and connectivity, clearer instructions and corrections, useful practical work, interpersonal mentorship and leadership networks.

## External educational references
Curriculum is original WOMATE-authored teaching text; the following sources are for checking climate facts, further reading and instructional framing. No third-party lessons, videos, university worksheets or platform proprietary content are copied.
- IPCC AR6 synthesis: https://www.ipcc.ch/report/ar6/syr/
- IPCC AR6 impacts/adaptation: https://www.ipcc.ch/report/ar6/wg2/
- IPCC AR6 mitigation: https://www.ipcc.ch/report/ar6/wg3/
- UNFCCC Gender Action Plan: https://unfccc.int/topics/gender/workstreams/the-gender-action-plan
- UNFCCC climate finance: https://unfccc.int/topics/climate-finance/the-big-picture/introduction-to-climate-finance
- UNESCO AI ethics: https://www.unesco.org/ethics-ai/en/recommendation
- FAO climate-smart agriculture: https://www.fao.org/science-technology-and-innovation/resources/publications/climate-smart-agriculture-sourcebook/en
- United Nations SDG13: https://sdgs.un.org/goals/goal13

## Tester and access
Tester routes /canopy/test/cohort-preview and /canopy/test/cohort-workspace preview all weeks without date restrictions. Read-only: no learner assignments, attendance, certificate issuance or other changes. Learners require a real active 2027 cohort membership for submissions and progress; instructors must be manually approved before drafting expert courses. Draft courses are not listed publicly. RLS protects the data tables and authenticated RPCs check roles and owners.

## Administrative controls
Admin cohort selector powers 2027-specific Operations, Access, Review assignments, Attendance, Certificates and Reports. Other mature Cohort 2 operational modules remain isolated until their adapters are migrated; do not represent them as fully ported. Admissions and email/scratch-card workflows now exist but require separate official-cohort testing, monitoring and acceptance verification before general release. Course certificate issuance is manually approved, no automatic PDF generated. CDKN partnership remains proposed and is not represented as signed.

## Production acceptance checklist
1. Sign in as an admin; select Cohort 2, C3, Asia C1 and verify no cross-cohort learner leakage.
2. Sign in as tester; inspect all five modules and all six views across both 2027 cohorts; confirm no learner progress or certificates are created.
3. Sign in as a real test learner **assigned to a future cohort**; test module completion, submission, revise-and-resubmit, admin review, attendance and eligibility.
4. Sign in as expert; submit profile, review approval and private draft, write three lessons and an assignment per module, submit for quality assurance.
5. Review expert course as admin and verify only approved courses list publicly; no disabled checkout can be bypassed.
6. Verify certificate issuance only for learners with complete lesson, assignment and attendance requirements.
7. Perform accessibility checks (keyboard focus, screen reader labels, mobile, slow internet, high contrast) and regional content review.
8. Confirm external partners, official programme launch dates and financial rules before opening enrolment.

The specialist course payment and expert payout flows, full confirmed live-session schedule, and automated certificate PDFs remain out of scope. The cohort admissions implementation is configured but admissions are presently closed. Selection must be verified end to end before real batches.
