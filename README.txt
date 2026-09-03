WOMATE Main Architecture Update

This patch only changes the public WOMATE main experience. It does not replace or edit src/canopy.

Changes:
- Desktop highlighted CTA: Join the community -> Donate
- New /donate page
- Homepage nonprofit positioning
- SEO + schema nonprofit/NGO positioning
- Donation page prepared for VITE_DONATE_URL
- Mobile navigation intentionally left unchanged

Run from the WOMATE project root after extracting the ZIP:
node womate_main_arch_patch.js

The patch creates src/main.jsx.before-donate.bak before writing.

Optional .env when donation checkout is ready:
VITE_DONATE_URL=https://...
