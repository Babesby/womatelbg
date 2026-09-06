# WOMATE SELECTED CARD GENERATOR

Permanent public route:

https://www.womate.org/selected

## INCLUDED

- Official WOMATE branded card
- Email + selection-code verification
- Database-locked learner name
- Database-locked programme
- Database-locked cohort
- Photo upload
- Photo zoom
- Photo horizontal positioning
- Photo vertical positioning
- Browser-only photo processing
- 1080 x 1080 PNG generation
- PNG download
- Native device sharing where supported
- Mobile responsive layout
- Desktop responsive layout
- No demo learners
- No fake verification
- Separate database migration
- Does not modify the existing Canopy master SQL

## INSTALL

From:

C:\phill\wo-web\ww\womate_build

Run:

node .\WOMATE_SELECTED_CARD_GENERATOR\install_selected_card.cjs; npm run build; npm run dev

## DATABASE

Run this file once inside Supabase SQL Editor:

WOMATE_SELECTED_CARD_GENERATOR\SELECTED_OPERATIONS\WOMATE_SELECTED_CARD_ACCESS.sql

## IMPORTANT

The SQL expects the existing WOMATE Canopy admin helper:

public.canopy_is_womate_admin(uuid)

Your current Canopy master already provides this helper.

## CREATE A LEARNER SELECTION CODE

The secure RPC is:

womate_create_selected_card_invite

It should be called while authenticated as an actual WOMATE Admin.

The returned JSON contains:

selection_code

Send that code to the selected learner together with their official selection email.

The learner then visits:

https://www.womate.org/selected

and enters:

1. Their selected email address
2. Their WOMATE selection code

The page returns only that matching learner's:

- full name
- programme
- cohort

The learner cannot edit those official fields.

## PHOTO PRIVACY

The learner photograph is not sent to Supabase.

It is loaded locally with the browser File API and rendered into the final PNG using Canvas.

## ROUTING

The installer adds an isolated /selected route gate to src/main.jsx.

The original main.jsx is backed up once as:

src/main.jsx.before-selected-card.bak

The selected route is loaded separately and does not alter Canopy source files.
