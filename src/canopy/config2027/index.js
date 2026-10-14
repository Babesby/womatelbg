// Draft-only 2027 programme configuration. Never import Cohort 2 data here.
import climate from './she-leads-climate-c3-2027.json';
import asia from './she-leads-asia-c1-2027.json';
import advanced from './she-leads-advanced-c1-2027.json';

export const CANOPY_2027_CONFIGS = Object.freeze({
  [climate.cohortKey]: climate,
  [asia.cohortKey]: asia,
  [advanced.cohortKey]: advanced
});
export function getCanopy2027Draft(cohortKey) {
  return CANOPY_2027_CONFIGS[String(cohortKey || '')] || null;
}
// Safe for participant consumers: only explicitly approved AND published content is returned.
export function getCanopy2027Published(cohortKey) {
  const config = getCanopy2027Draft(cohortKey);
  return config && config.lifecycle === 'published' && config.publication.approved === true && config.publication.published === true ? config : null;
}
