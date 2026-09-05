# WOMATE Canopy — Isolated Tester Dashboard V2

This V2 fixes the earlier patch's brittle route-helper match.

Tester:
- Email: p.viewmultimedia@gmail.com
- Password: use the password already chosen by WOMATE; it is not written to code/SQL.

Apply:
1. Extract into project root.
2. Run:
   node .\CANOPY_TESTER\apply_tester_mode.cjs
3. Create/confirm the tester user in Supabase Authentication if not already created.
4. Run CANOPY_TESTER\WOMATE_CANOPY_TESTER_MODE.sql in Supabase SQL Editor.
5. Run:
   node .\CANOPY_TESTER\audit_tester_mode.cjs; npm run build

Isolation:
- Exact authenticated email only.
- Tester role is neither participant/admin/manager.
- No cohort enrollment is required for tester.
- Normal participant schedule code remains unchanged.
- Normal participant assignment RPC remains unchanged.
- Tester has a separate RPC for immediate grading.
- Manager snapshot filters tester-owned records out.
