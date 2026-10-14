const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '../src/canopy/config2027');
const names = ['she-leads-climate-c3-2027','she-leads-asia-c1-2027','she-leads-advanced-c1-2027'];
for (const name of names) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
  const fail = msg => { throw new Error(name + ': ' + msg); };
  if(c.cohortKey !== name || c.year !== 2027) fail('identity mismatch');
  if(c.lifecycle !== 'draft' || c.publication.approved || c.publication.published) fail('must remain unpublished');
  if(c.completion.enabled || c.completion.certificateEnabled || c.opportunities.visible || c.missions.enabled) fail('premature activation');
  if(c.modules.length !== 6) fail('unexpected module count');
  if(c.modules.some(m => !m.id || m.liveSession.startsAt || m.liveSession.meetingUrl || m.liveSession.speakers.length || m.assignment.dueAt || m.assignment.submissionEnabled || m.assignment.rubric)) fail('unapproved session or assessment activation');
  if(c.accessModel === 'paid' && (!c.payment.required || !c.payment.installmentsAllowed || c.payment.gateway !== 'not_configured')) fail('unsafe Advanced gate');
  if(c.accessModel === 'free' && c.payment.required) fail('unexpected payment requirement');
}
console.log('2027 draft configuration safety validation passed for 3 cohorts.');
