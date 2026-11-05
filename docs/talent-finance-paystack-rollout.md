# WOMATE Talent Discovery finance rollout

This module handles commercial facilitation fees paid by a commissioning organisation, not the learner. It does not charge any existing collaboration retroactively.

## Readiness gates

1. Requester email ownership confirmed and organisation evidence reviewed.
2. WOMATE proposes terms for a new eligible accepted public request.
3. Learner and requester separately consent to the exact scope, currency, deal value and fee percentage.
4. Learner and requester each confirm delivery; an admin independently verifies completion.
5. Admin creates and issues the fee invoice.
6. The requester checks the invoice using the original private request link and signs in with the matching verified email.
7. Optional test-mode Paystack checkout can be enabled only after configuration and acceptance tests.
8. A signed webhook and a fresh server-side Paystack transaction verification must match the stored invoice reference, GHS currency, amount in pesewas, and invoice status before the invoice can become paid.

If no payment key or enable flag is configured, checkout returns 503 and no charge is attempted. Frontend must never mark an invoice paid.

## Supabase Edge Functions

- `womate-talent-checkout`: JWT required; authenticates via the existing Canopy session and the confidential request token.
- `womate-talent-paystack-webhook`: JWT disabled because Paystack sends webhooks without a user token. Validates Paystack's cryptographic signature; re-verifies the transaction with Paystack; reconciles via service-role-only RPC.

Set the following **Supabase Edge Function secrets**, never VITE_ variables:

- `PAYSTACK_SECRET_KEY`: a valid **test** key (`sk_test_`).
- `PAYSTACK_WEBHOOK_SIGNING_SECRET`: optional new-format webhook secret (`whsec_`); needed if Paystack sends `Paystack-Signature` (legacy `x-paystack-signature` also supported).
- `WOMATE_TALENT_PAYMENTS_ENABLED`: `true` **only after** test-mode merchant setup and webhook simulation; otherwise omit or set `false`.

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically to Edge Functions in supported deployments.

Configure the Paystack **test mode** webhook URL:
`https://bwnwhsvssgponrzvwlpt.supabase.co/functions/v1/womate-talent-paystack-webhook`

The checkout function permits the verified provider's hosted payment page, and currently **GHS only**. This is deliberate. Other currencies require a documented settlement/merchant capability and an explicit implementation before activation.

### Go-live checklist

- Use distinct test accounts for WOMATE admin, learner and external requester.
- Verify unauthorised users cannot read financial ledgers, private messages, service secrets or invoice records.
- Test verification gates, accept/decline, disputes, closeout confirmations, admin issuance, duplicate requests and expired/revoked private links.
- Test Paystack signed webhooks (valid, invalid, replayed and duplicated), delayed notifications, amount mismatch, currency mismatch, abandoned checkout, and provider outage.
- Confirm invoice, payment and fee accounting reconciles to actual Paystack transactions.
- Confirm taxation, invoicing entity, VAT, refund handling and terms with WOMATE's finance/legal adviser.
- For production live payments, implement and test a separately reviewed live-mode configuration. **Do not change `sk_test_` to `sk_live_` in this implementation**: test-only guardrails intentionally prevent live charging.

### Reporting

Admin: Canopy → Manage → Talent → Finance.
- Invoices and finance reports are available to WOMATE administrators only.
- Revenue is aggregated by currency, not artificially summed across currencies.
- Weekly report snapshots run at 07:00 UTC on Mondays via Supabase pg_cron.
- The first snapshot will contain the prior Monday–Sunday window.
- An admin reporting RPC also computes current rolling metrics without waiting for the scheduled snapshot.

Do not mark an invoice paid manually based on a screenshot, an email, a redirect URL or a browser callback.
