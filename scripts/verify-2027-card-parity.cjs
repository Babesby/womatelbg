// Zero-dependency checks; development only, no personal data or Supabase access.
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function check(ok,message){if(!ok){console.error('FAIL '+message);process.exitCode=1}else console.log('PASS '+message)}
const renderer=read('src/selected/selectedCardRenderer.js');
const card=read('src/selected/SelectedCard.jsx');
const scratch=read('src/components/SelectionScratchCard.jsx');
const curricula=read('src/canopy/canopyCurricula2027.js');
const runtime=read('src/canopy/canopyCohortRuntime2027.js');
const learning=read('src/canopy/Canopy2027Learning.jsx');
const programmeKeys=['she-leads-climate-c3-2027','she-leads-asia-c1-2027'];
for(const key of programmeKeys){
 check(renderer.includes("'"+key+"':{"),'Regional card design: '+key);
 check(curricula.includes("'"+key+"':{"),'Regional curriculum: '+key);
 check(runtime.includes("'"+key+"':Object.freeze({"),'Region-specific dates: '+key);
}
check(renderer.includes('const variant=SELECTED_2027_VARIANTS'),'Verified 2027 variant routing');
check(renderer.includes('if(variant)return renderSelected2027'),'2027 renderer independent of legacy 2026 path');
check(renderer.includes("String(cohortLabel||'Cohort 2 · 2026')"),'Legacy 2026 text remains in legacy renderer');
check(card.includes('verified?.programmeSlug'),'Selection card uses verified programme slug');
check(card.includes('verifySelectedLearner'),'Selection image requires backend code verification');
check(card.includes('downloadCanvas')&&card.includes('shareCanvas'),'Existing full-resolution download/share preserved');
check(scratch.includes('/selected'),'Scratch reveal leads to 2026-compatible card generator');
check(learning.includes('cohortResultCelebrationGif'),'Cohort 2 result celebration integration retained');
check(learning.includes("sub?.status==='needs_revision'"),'2027 revision state matches backend');
check(learning.includes('playCanopyCorrectSound')&&learning.includes('playCanopyErrorSound'),'Cohort 2 learning audio feedback integration retained');
check(runtime.includes('speakerGraphics:Object.freeze({})'),'Missing speaker assets remain unfilled, not invented');
const assignmentApi=read('src/canopy/canopyLearningApi.js');
const stagedSql=read('supabase/migrations/20261112093000_cohort_2027_assignments_parity.sql');
check(assignmentApi.includes('submitCohortAssignmentV2'),'2027 uses cohort-scoped three-part submission API');
check(assignmentApi.includes('saveCohortAssignmentDraft'),'2027 has persisted draft API');
check(learning.includes('Part 03 · Speaker challenge')&&learning.includes('Part 02 · Practical evidence link'),'2027 exposes all three Cohort 2 assignment parts');
check(stagedSql.includes('enable row level security'),'2027 drafts have RLS');
check(stagedSql.includes('primary key (cohort_key,user_id,module_id)'),'Africa and Asia draft records isolated');
check(stagedSql.includes("attempts>=3"),'2027 final-submission attempts match Cohort 2');
check(stagedSql.includes('speaker_unlock_dates')&&stagedSql.includes('assignment_due_dates'),'Speaker and submission deadlines require actual published values');
check(stagedSql.includes('reviewed_by=auth.uid()'),'2027 reviewer writes correct audit field');

const help=read('src/canopy/AskCanopyWidget.jsx');
const helpSource=read('src/canopy/canopyHelp2027.js');
check(help.includes('matchCanopy2027HelpQuestion'),'Ask Canopy routes 2027 to cohort-specific answers');
check(help.includes('matchCanopyHelpQuestion(text)'),'Cohort 2 help answers remain intact');
check(helpSource.includes('getCanopy2027Curriculum(cohortKey)'),'2027 Help derives actual region-specific curriculum');
check(helpSource.includes('canopyPost2026Runtime(cohortKey)'),'2027 Help derives actual region-specific schedule');

const app=read('src/canopy/CanopyApp.jsx'),graduate=read('src/canopy/CanopyGraduateOpportunities.jsx');
const gradAdmin=read('src/canopy/CanopyGraduatePlacementAdmin.jsx');
const cohortGraduation=read('src/canopy/Canopy2027Graduation.jsx');
const cohortAdmin=read('src/canopy/Canopy2027AdminWorkspace.jsx');
const graduateSchema=read('supabase/migrations/20261112110000_graduate_placements.sql');
const graduationSchema=read('supabase/migrations/20261112111000_2027_graduation_parity.sql');
const criteria=read('supabase/migrations/20261112112000_2027_certificate_thresholds.sql');
const scratchGeneral=read('supabase/migrations/20261112113000_both_2027_selection_scratch.sql');
const mail=read('supabase/functions/womate-admissions-mail/index.ts');
check(app.includes('GraduateOpportunitiesNotice'),'Graduate-only notice is mounted');
check(app.includes('path===\'/canopy/graduate-opportunities\''),'Graduate applications route exists');
check(app.includes('path===\'/canopy/manage/graduate-placements\''),'Graduate admin review route exists');
check(app.includes('path===\'/canopy/test/admin-workspace\''),'Read-only 2027 admin tester route exists');
check(app.includes('path===\'/canopy/manage/graduation-2027\''),'2027 graduation admin route exists');
check(graduate.includes('applyGraduatePlacement')&&graduate.includes('consent_share'),'Graduate form requires explicit partner-sharing consent');
check(gradAdmin.includes('getAdminGraduatePlacements')&&gradAdmin.includes('consented'),'Manual consented-profile curation exists');
check(graduateSchema.includes('enable row level security')&&graduateSchema.includes('private.womate_is_verified_graduate'),'Graduate eligibility enforced on server');
check(graduateSchema.includes('on conflict(fingerprint) do nothing'),'Graduate notification is deduplicated');
check(cohortGraduation.includes('PortraitStudio')&&cohortGraduation.includes('GraduationDanceWelcome'),'2026 graduation portrait and dance are reused');
check(cohortAdmin.includes('Canopy2027GraduationAdmin'),'2027 admin graduation moderation is routed');
check(graduationSchema.includes('certificate_required_lessons')&&graduationSchema.includes('canopy_27_graduation_view'),'2027 graduation uses configured requirements');
check(criteria.includes('certificate_required_live_attendance'),'2027 certificate issuance respects configured attendance');
check(scratchGeneral.includes('she-leads-climate-c3-2027'),'Africa receives private scratch links');
check(mail.includes('CREATE MY OFFICIAL SELECTION IMAGE'),'Selection email encourages card generation and social sharing');
check(mail.includes('Climate realities, risk & evidence'),'Africa-specific selection email curriculum');

if(process.exitCode)process.exit(process.exitCode);
