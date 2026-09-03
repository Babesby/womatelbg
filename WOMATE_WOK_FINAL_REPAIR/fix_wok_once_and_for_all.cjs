const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const file = path.resolve(process.cwd(), 'src', 'main.jsx');
if (!fs.existsSync(file)) {
  console.error('ERROR: src/main.jsx not found. Run this from the WOMATE project root.');
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const backup = file + '.before-wok-final-repair.bak';
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

// -----------------------------------------------------------------------------
// A. SAFE ENCODING CLEANUP
// Only known mojibake byte sequences are replaced.
// This does NOT rename identifiers, routes, asset slugs, or arbitrary words.
// -----------------------------------------------------------------------------
const mojibake = new Map([
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€¦', '…'],
  ['Â·', '·'],
  ['Â©', '©'],
  ['Â®', '®'],
  ['Â', ''],
]);
for (const [bad, good] of mojibake) s = s.split(bad).join(good);

// -----------------------------------------------------------------------------
// B. REPAIR ONLY THE WOK INTERNAL COMPONENT IDENTIFIER
// React identifier must remain WokAction.
// -----------------------------------------------------------------------------
s = s
  .replace(/function\s+(?:WoK|WOK)\s+Action\s*\(/g, 'function WokAction(')
  .replace(/<\s*(?:WoK|WOK)\s+Action\s*\/>/g, '<WokAction/>')
  .replace(/<\s*(?:WoK|WOK)\s+Action\s*>/g, '<WokAction>');

// -----------------------------------------------------------------------------
// C. CANONICAL PUBLIC ROUTE
// Human name is "WoK Action"; URL is always "/wok-action".
// Asset filename remains "wok-action.png".
// -----------------------------------------------------------------------------
s = s
  .replace(/\/(?:WoK|WOK)(?:%20|\s|—|–|-|\.)+Action(?=(?:['"`?#/\s]|$))/g, '/wok-action')
  .replace(/\/(?:WoK|WOK)%20Action/g, '/wok-action')
  .replace(/(to|href)=["']\/(?:WoK|WOK)[^"']*Action["']/g, '$1="/wok-action"')
  .replace(/['"]\/(?:WoK|WOK)[^'"]*Action['"](?=\s*:)/g, "'/wok-action'");

// -----------------------------------------------------------------------------
// D. HUMAN-FACING BRAND NAME ONLY
// We deliberately do NOT replace lowercase "wok-action" because that is the
// correct URL / filename slug.
// -----------------------------------------------------------------------------
const displayForms = [
  /WoK—Action/g,
  /WoK–Action/g,
  /WoK-Action/g,
  /WoK\.\s*Action/g,
  /WOK—ACTION/g,
  /WOK—Action/g,
  /WOK–Action/g,
  /WOK-Action/g,
  /WOK\.\s*Action/g,
  /WOK Action/g,
];
for (const re of displayForms) s = s.replace(re, 'WoK Action');

// -----------------------------------------------------------------------------
// E. HARD-LOCK THE KNOWN WOK SOURCES OF TRUTH
// -----------------------------------------------------------------------------

// pages registry
s = s.replace(
  /['"]\/wok-action['"]\s*:\s*\{\s*k\s*:\s*['"][^'"]*['"]/,
  "'/wok-action':{k:'WoK Action'"
);

// SEO
s = s.replace(
  /(['"]\/wok-action['"]\s*:\s*\{\s*title\s*:\s*['"])[^'"]*(['"])/,
  "$1WoK Action | Women’s Climate Knowledge | WOMATE$2"
);

// Home program card
s = s.replace(
  /\[\s*['"]WoK Action['"]\s*,\s*['"][^'"]*['"]\s*,\s*['"]\/wok-action['"]\s*,\s*<Leaf size=\{22\}\/>\s*,\s*[^,\]\n]+\]/,
  "['WoK Action','Women’s local knowledge as living climate infrastructure.','/wok-action',<Leaf size={22}/>,heroAssets?.wok]"
);

// Hero artwork
s = s.replace(
  /(\bheroAssets\s*=\s*\{[\s\S]*?\bwok\s*:\s*)['"][^'"]*['"]/,
  "$1'/assets/hero/wok-action.png'"
);

// Main WoK page H1
s = s.replace(
  /(<section className="hero hero-wok[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/,
  '$1WoK Action$2'
);

// WoK page prose brand mentions, but only exact display variants
s = s.replace(/WoK Action treats/g, 'WoK Action treats');
s = s.replace(/WoK Action research/g, 'WoK Action research');

// Footer / nav JSX text is already normalized above.

// -----------------------------------------------------------------------------
// F. FIX THE SPECIFIC QUOTE THE USER REPORTED
// -----------------------------------------------------------------------------
s = s.replace(
  /["“]?Rising Together: How Women[’']s Local Wisdom and Everyday Leadership Shape Adaptation\.["”]?/g,
  '“Rising Together: How Women’s Local Wisdom and Everyday Leadership Shape Adaptation.”'
);

// -----------------------------------------------------------------------------
// G. WRITE + VALIDATE
// -----------------------------------------------------------------------------
fs.writeFileSync(file, s, 'utf8');

const failures = [];
if (/â€œ|â€|â€™|â€˜|â€”|â€“|Â/.test(s)) failures.push('known mojibake still exists');
if (/function\s+(?:WoK|WOK)\s+Action\s*\(/.test(s)) failures.push('invalid React component identifier still exists');
if (!/function\s+WokAction\s*\(/.test(s)) failures.push('WokAction component not found');
if (!/['"]\/wok-action['"]\s*:/.test(s)) failures.push('canonical /wok-action route registry key missing');
if (/\/(?:WoK|WOK)(?:%20|\s)+Action/.test(s)) failures.push('a broken WoK route with spaces still exists');
if (!/wok\s*:\s*['"]\/assets\/hero\/wok-action\.png['"]/.test(s)) failures.push('WoK hero asset path is not canonical');
if (!/['"]WoK Action['"][\s\S]{0,200}['"]\/wok-action['"][\s\S]{0,120}heroAssets\?\.wok/.test(s)) failures.push('home WoK card is not canonical');
if (!/“Rising Together: How Women’s Local Wisdom and Everyday Leadership Shape Adaptation\.”/.test(s)) failures.push('Rising Together quote was not repaired');

if (failures.length) {
  console.error('\nFINAL REPAIR STOPPED ON VALIDATION:');
  failures.forEach(x => console.error(' - ' + x));
  console.error('\nBackup:', backup);
  process.exit(2);
}

console.log('\nWOMATE WOK FINAL REPAIR COMPLETE');
console.log('Brand name   : WoK Action');
console.log('Public route : /wok-action');
console.log('Component    : WokAction');
console.log('Hero image   : /assets/hero/wok-action.png');
console.log('Quote        : “Rising Together: How Women’s Local Wisdom and Everyday Leadership Shape Adaptation.”');
console.log('Encoding     : known mojibake cleaned');
console.log('Backup       :', backup);

// Run production build automatically so this is not considered complete unless Vite agrees.
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false
});
if (build.status !== 0) {
  console.error('\nRepair was written, but the production build failed.');
  process.exit(build.status || 1);
}
console.log('\nPRODUCTION BUILD PASSED.');
