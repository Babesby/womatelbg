WOMATE — CANOPYCANVAS + CANTEST

LIVE CANOPYCANVAS
- Audience is a dropdown.
- Desired action is a dropdown.
- Message is the only campaign-content field that accepts typing.
- Tone is functional: it creates a tone-specific suggested message and affects preview treatment.
- Canopy logo is automatically applied as a small watermark.
- Background choices include solids, gradients and colour combinations.
- Selectable textures: clean, dots, diagonal lines, grid, climate waves, paper grain.
- Selectable line icons: leaf, sun, water, globe, advocacy, wind, trees, wellbeing.
- Up to 3 icons can be added.
- Downloaded PNG includes background, texture, icons and watermark.

CANTEST
- Installer creates src/cantest as a duplicate of the current src/canopy.
- Open: /canopy/cantest
- Timing is OFF.
- All five course modules are open.
- All assignment weeks are open.
- Thursday speaker tasks are open.
- Active-enrolment lock is bypassed only inside CANTEST.
- Assignment test submissions are kept in browser localStorage so they do not pollute live Supabase records.
- 3-attempt behaviour is still testable.
- Embedded course videos use the same env variables as live Canopy.
- Live Canopy timing is untouched.

IMPORTANT APPROVAL FLOW
CANTEST is deliberately isolated. Editing/testing CANTEST does NOT automatically overwrite live Canopy.
When a CANTEST change is approved, tell ChatGPT “approved — sync this to Canopy”. The approved change can then be mirrored to the live Canopy while preserving live timing/security rules.
This is safer than an automatic file watcher that could accidentally push unfinished test changes into production.
