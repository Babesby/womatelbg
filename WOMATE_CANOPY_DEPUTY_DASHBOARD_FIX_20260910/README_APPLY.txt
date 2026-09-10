WOMATE CANOPY — DEPUTY DASHBOARD FIX
10 September 2026

Root cause of blank Deputy dashboard:
CanopyStaffWorkspace referenced refreshKey before the React state variable was initialized.
In the production bundle this became:
  ReferenceError: Cannot access '_' before initialization
That crashes the entire staff workspace render.

Second issue:
The browser retried a pending Team Access Code after the code had already activated the account.
The database correctly said the single-use code was used, but the retry generated a 400 on every load.

This patch:
- fixes the React initialization order;
- keeps all four staff-role workspaces intact;
- makes a retry of the SAME already-activated code/user return the existing active membership instead of an error;
- does NOT allow another user to reuse the code;
- does NOT make codes multi-use;
- preserves existing staff memberships and assignments;
- removes internal implementation copy from the Admin Preview banner.

Apply, build, run included SQL once, then hard refresh.
