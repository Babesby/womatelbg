const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), 'src', 'main.jsx');
if (!fs.existsSync(file)) {
  console.error('ERROR: src/main.jsx was not found. Run this from the WOMATE project root.');
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const backup = file + '.before-wok-deep-fix.bak';
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

// 1) Repair the internal React identifier ONLY. It must never contain spaces.
s = s
  .replace(/function\s+(?:WoK|WOK)\s+Action\s*\(/g, 'function WokAction(')
  .replace(/<\s*(?:WoK|WOK)\s+Action\s*\/>/g, '<WokAction/>')
  .replace(/<\s*(?:WoK|WOK)\s+Action\s*>/g, '<WokAction>');

// 2) Repair the public route wherever a previous text replacement changed it.
//    This intentionally does NOT touch /assets/hero/wok-action.png.
s = s
  .replace(/\/(?:WoK|WOK)(?:%20|\s|[-—–.])+Action(?=(?:['"`?#/\s]|$))/g, '/wok-action')
  .replace(/\/(?:WoK|WOK)%20Action/g, '/wok-action');

// 3) Repair common mojibake without changing code identifiers.
s = s
  .replace(/Womenâ€™s/g, 'Women’s')
  .replace(/womenâ€™s/g, 'women’s')
  .replace(/WoKâ€”Action/g, 'WoK Action')
  .replace(/WOKâ€”ACTION/g, 'WoK Action');

// 4) Normalize the BRAND DISPLAY NAME only in capitalized/human-facing forms.
//    Lowercase "wok-action" is deliberately excluded because that is the route/asset slug.
s = s
  .replace(/WoK—Action/g, 'WoK Action')
  .replace(/WoK–Action/g, 'WoK Action')
  .replace(/WoK-Action/g, 'WoK Action')
  .replace(/WoK\.\s*Action/g, 'WoK Action')
  .replace(/WOK—ACTION/g, 'WoK Action')
  .replace(/WOK—Action/g, 'WoK Action')
  .replace(/WOK-Action/g, 'WoK Action')
  .replace(/WOK\.\s*Action/g, 'WoK Action')
  .replace(/WOK Action/g, 'WoK Action');

// 5) Hard-lock the canonical page registry key + display label when present.
s = s.replace(
  /['"]\/wok-action['"]\s*:\s*\{\s*k\s*:\s*['"][^'"]*['"]/,
  "'/wok-action':{k:'WoK Action'"
);

// 6) Hard-lock the SEO route key/name when present.
s = s.replace(
  /(['"]\/wok-action['"]\s*:\s*\{\s*title\s*:\s*['"])[^'"]*(['"])/,
  "$1WoK Action | Women’s Climate Knowledge | WOMATE$2"
);

// 7) Hard-lock home programme #02: name, copy, canonical route and artwork.
//    This repairs BOTH the broken link and the missing home artwork.
s = s.replace(
  /\[\s*['"](?:WoK|WOK)[^'"]*Action['"]\s*,\s*['"][^'"]*local knowledge[^'"]*['"]\s*,\s*['"][^'"]*['"]\s*,\s*<Leaf size=\{22\}\/>\s*,\s*heroAssets\?\.[A-Za-z0-9_]+\s*\]/i,
  "['WoK Action','Women’s local knowledge as living climate infrastructure.','/wok-action',<Leaf size={22}/>,heroAssets?.wok]"
);

// Fallback if programme copy itself was mojibaked or changed.
s = s.replace(
  /\[\s*['"]WoK Action['"]\s*,\s*['"][^'"]*['"]\s*,\s*['"]\/wok-action['"]\s*,\s*<Leaf size=\{22\}\/>\s*,\s*[^,\]\n]+\]/,
  "['WoK Action','Women’s local knowledge as living climate infrastructure.','/wok-action',<Leaf size={22}/>,heroAssets?.wok]"
);

// 8) Hard-lock WoK artwork paths. These are FILE SLUGS, so hyphen remains correct here.
s = s.replace(
  /(\bheroAssets\s*=\s*\{[\s\S]*?\bwok\s*:\s*)['"][^'"]*['"]/,
  "$1'/assets/hero/wok-action.png'"
);

// 9) Repair nav array entry if it exists.
s = s.replace(
  /\[\s*['"](?:WoK|WOK)[^'"]*Action['"]\s*,\s*['"][^'"]*['"]\s*\]/g,
  "['WoK Action','/wok-action']"
);

// 10) Repair human-facing JSX labels while preserving component identifiers and slugs.
s = s
  .replace(/>WOK\.\s*Action</g, '>WoK Action<')
  .replace(/>WOK Action</g, '>WoK Action<')
  .replace(/>WoK[-—–.]Action</g, '>WoK Action<')
  .replace(/>WoK\s+Action</g, '>WoK Action<');

// 11) Ensure App still renders the correct component name if a prior replacement damaged it.
s = s
  .replace(/p\.type===['"]wok['"]\s*\?\s*<\s*(?:WoK|WOK)\s+Action\s*\/>/g, "p.type==='wok'?<WokAction/>");

// 12) Final canonical-route cleanup in href/to/page keys only.
s = s
  .replace(/(to|href)=["']\/(?:WoK|WOK)[^"']*Action["']/g, '$1="/wok-action"')
  .replace(/['"]\/(?:WoK|WOK)[^'"]*Action['"](?=\s*:)/g, "'/wok-action'");

// Write.
fs.writeFileSync(file, s, 'utf8');

// Guardrails: fail loudly if the dangerous corruption survives.
const failures = [];
if (/function\s+(?:WoK|WOK)\s+Action\s*\(/.test(s)) failures.push('invalid React function name still exists');
if (/\/(?:WoK|WOK)(?:%20|\s)+Action/.test(s)) failures.push('broken WoK route with spaces still exists');
if (!/function\s+WokAction\s*\(/.test(s)) failures.push('WokAction component was not found');
if (!/['"]\/wok-action['"]\s*:/.test(s)) failures.push('canonical /wok-action page registry key was not found');
if (!/wok\s*:\s*['"]\/assets\/hero\/wok-action\.png['"]/.test(s)) failures.push('canonical WoK hero artwork path was not found');
if (!/['"]WoK Action['"][\s\S]{0,180}['"]\/wok-action['"][\s\S]{0,100}heroAssets\?\.wok/.test(s)) failures.push('home WoK programme card is not canonical');

if (failures.length) {
  console.error('\nWOK DEEP FIX WROTE THE SAFE CHANGES, BUT THESE CHECKS NEED ATTENTION:');
  failures.forEach(x => console.error(' - ' + x));
  console.error('\nBackup:', backup);
  process.exit(2);
}

console.log('\nWOK ACTION DEEP FIX COMPLETE');
console.log('Display name : WoK Action');
console.log('Public route : /wok-action');
console.log('Home artwork : /assets/hero/wok-action.png');
console.log('React component: WokAction');
console.log('Mojibake Womenâ€™s repaired where found.');
console.log('Backup:', backup);
