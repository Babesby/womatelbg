# WOMATE newsletter and course-feedback campaigns

## Release status
The native popup/survey code is developed on `womate-work`. Do not merge to `main` until the deployment owner approves the release and the Google Sheets service account is configured.

## Google Sheets connection
Destination: `ALL SUBSCRIBERS`, spreadsheet ID `1xijb4f2CW3rT7cvj7sNAJNI0hAyb5E5G6qZbrHqccjU`, existing tab `Sheet1`.

1. Use a Google Cloud service account with **Google Sheets API** enabled.
2. Share the **ALL SUBSCRIBERS** spreadsheet with its `client_email` as **Editor**.
3. In the Vercel project, configure a **server-only** variable `WOMATE_GOOGLE_SERVICE_ACCOUNT_JSON` containing the complete JSON service-account key. Do not place it in the source repository, front-end code, or a `VITE_` variable.
4. For course feedback, ensure Vercel also has server-only `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the existing `VITE_CANOPY_SUPABASE_URL` and `VITE_CANOPY_SUPABASE_ANON_KEY` fallback is supported on the server).
5. The endpoint creates `Campaign Events` automatically. The newsletter checks existing values in `Sheet1!A:A` case-insensitively and appends new subscribers to `Sheet1!A:B`; the second column stores submission timestamp. The events tab records successful signups and authenticated course reviews.

**Do not consider this live** until credentials have been configured and an end-to-end test confirms both a new signup and an existing-email duplicate response.

## Campaign behavior
Public website popup: 10 seconds; first-time visitor only; maximum 2 impressions per browser; 1-day delay after dismissal; successful response permanently suppresses the popup in that browser. Responses use the existing first column as the newsletter master list. Browser storage is a visitor-level convenience, not a reliable cross-device identity.

Course-completion feedback: a learner must finish all course lessons and have every assessment approved. The backend independently verifies the completed course through the authenticated Canopy RPC. One response per course per email is recorded in `Campaign Events`.

## Limitations to verify before release
- Google Sheets check-then-append is not an atomic unique constraint. Rare simultaneous submissions can still race. For strict guaranteed concurrency deduplication, use a database unique index and transactional persistence as the primary write layer.
- The service needs Google Sheets credentials and editor sharing; ChatGPT's Google Drive connection is not available to Vercel automatically.
- The popup currently references the repository's existing `/assets/hero/circle.png` illustration. Replace this with the approved uploaded WOMATE globe asset before the final visual signoff.
- Event tracking currently records **successful submissions**, not anonymous popup impressions. Impressions and dismissals are stored in each visitor's browser for frequency capping.
- Verify responsive design, focus order, build compilation, form privacy/audit checks, and submission behavior in a nonproduction test environment before merging.
