# WOMATE Premium Platform — V3

V3 replaces the programme hero art with WOMATE-specific African women climate character compositions and removes the previous grid/floating hero effects.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Routes include `/she-leads`, `/wok-action`, `/circle`, `/research`, `/resilient-minds`, `/honours`, `/funding`, `/leadership`, `/womateer`, and `/merchandise`.

## WOMATE Circle integrations
Add these values to `.env` (see `.env.example`):
- `VITE_CIRCLE_FORM_EMBED_URL` — Google Form embed URL for Circle credentials.
- `VITE_CIRCLE_PAYMENT_URL` — secure annual membership payment URL.
- `VITE_CIRCLE_WHATSAPP_URL` — WhatsApp community invite URL.
- `VITE_CIRCLE_INQUIRY_ENDPOINT` — POST endpoint accepting JSON fields `name`, `email`, `country`, `pathway`, `message`.

The production UI keeps credentials, payment, and community access as separate explicit steps. The Collective bypasses payment; Practitioner and Vanguard route through payment before community access.

## Climate Honours integration
`VITE_HONOURS_NOMINATION_FORM_URL` controls the nomination form opened from the Climate Honours page. If omitted, WOMATE's current Jotform at `https://form.jotform.com/260154019157048` is used.
