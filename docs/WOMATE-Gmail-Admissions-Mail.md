# WOMATE Admissions Gmail — one-time activation

The admissions mail architecture sends directly through Google's Gmail API. No Resend, SendGrid, Mailchimp, or other email-delivery vendor is required.

## Sender

- Intended mailbox: `womatead@gmail.com`
- Supabase Edge Function: `womate-admissions-mail`
- Gmail scope: `https://www.googleapis.com/auth/gmail.send`
- Worker schedule after activation: every 5 minutes
- Reminder queue schedule: daily at 07:15 UTC

## One-time Google authorization

1. Sign in to the Google account that owns `womatead@gmail.com`.
2. In Google Cloud, create or select a WOMATE-owned project.
3. Enable **Gmail API**.
4. Configure the Google Auth / OAuth consent screen for WOMATE.
5. Create an OAuth 2.0 client for a **Web application**.
6. Authorize only the Gmail sending scope:
   `https://www.googleapis.com/auth/gmail.send`
7. Request **offline access** and consent so Google returns a refresh token.
8. Store the resulting credentials directly in Supabase **Edge Functions → Secrets**. Never put these values in GitHub or browser code.

Required Supabase secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `WOMATE_GMAIL_FROM=womatead@gmail.com`
- `WOMATE_GMAIL_NAME=WOMATE`

Do not paste the client secret or refresh token into ChatGPT or commit them to the repository.

## Activate delivery

After the secrets have been set, enable the mail worker through the WOMATE admin database control:
`public.womate_admin_set_mail_enabled(true)`

This activates the existing cron worker `womate-admissions-mail-worker`.

## What is already automated

Admissions events automatically enter the mail queue for:

- application received
- under review
- selected
- waitlisted
- not selected
- offer accepted
- Canopy account linked
- onboarding complete
- offer expiry reminder
- incomplete-onboarding reminder

The worker uses branded HTML mail, Gmail message-ID tracking, exponential retry/backoff, and queue status tracking.

## Sending limits

Gmail/Google Workspace sending limits still apply. Do not burst thousands of messages from a new sender. For a normal @gmail.com mailbox, plan for roughly 500 outgoing messages per rolling day; Google Workspace accounts generally support higher daily volume. The queue is intentionally designed to pace and retry delivery.

## Security

- Gmail OAuth credentials live only in Supabase secrets.
- Admissions and mail queue tables are protected by RLS and do not grant direct read access to anonymous or ordinary authenticated users.
- The Edge Function requires WOMATE's internal worker token before it processes queued messages.
- The worker is disabled until WOMATE Gmail authorization is complete.
