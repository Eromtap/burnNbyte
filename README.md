## BurnnByte

BurnnByte is a Next.js app with a Prisma/Postgres backend and a Capacitor mobile wrapper in `apps/mobile`.

## Local Development

Install dependencies, make sure your `.env` is configured, then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Bootstrap

Admin access is database-backed through `User.isAdmin`.

To promote an existing user to admin:

```bash
npm run admin:grant -- you@example.com
```

Notes:
- The user must already exist in the database.
- You do not need to start the app before running this command.
- If the user is already signed in, sign out and back in after granting admin so the session picks up the new flag.

Admins can open `/admin/access` to search for users and grant or revoke manual full access.

## Access Model

Current access rules:
- New users get 14 days of full app access.
- After 14 days, users need an active subscription or a manual full-access grant.
- Specific users can be comped through the admin access UI.
- Admin users bypass app-access enforcement automatically.

Manual full-access grants are managed through the internal admin page and stored in the database.

## Useful Commands

```bash
npm run dev
npm run lint
npm run migrate:deploy
npm run admin:grant -- you@example.com
```

## Stripe web billing

Web subscriptions use Stripe Checkout and the Stripe customer portal. Configure these server-only values in `.env` (never expose the secret key in browser code):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_1U85ZX2ORNaK6on1HHSNfq3i
APP_URL=https://your-domain.example
```

Register `https://your-domain.example/api/stripe/webhook` as a Stripe webhook destination and select `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.

## Mobile Wrapper

The mobile app lives in `apps/mobile` and wraps the hosted web app with Capacitor.

Useful commands:

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
```

Set `CAPACITOR_SERVER_URL` in `apps/mobile/.env` to your deployed app URL for device builds.

## Kroger OAuth

The Kroger integration currently connects and disconnects a customer account only. It does not
submit a cart, select fulfillment, perform checkout, or place an order.

Configure these server-only values in `.env` and in the deployment environment:

```bash
KROGER_CLIENT_ID=...
KROGER_CLIENT_SECRET=...
KROGER_REDIRECT_URI=https://burn-nbyte.vercel.app/api/kroger/callback
RETAILER_TOKEN_ENCRYPTION_KEY=...
KROGER_OAUTH_ENABLED=false
LEGAL_ENTITY_NAME=...
PRIVACY_CONTACT_EMAIL=...
LEGAL_MAILING_ADDRESS=...
```

`RETAILER_TOKEN_ENCRYPTION_KEY` must be either a base64-encoded 32-byte key or 64 hexadecimal
characters. Keep it stable and secret; changing it makes existing encrypted Kroger tokens
unreadable. Register `KROGER_REDIRECT_URI` exactly as written in the Kroger developer console.

Keep `KROGER_OAUTH_ENABLED=false` until the OAuth migration and all Kroger secrets are deployed.
Set it to `true` only when the integration is ready for users.

Kroger callback route hosted by the Vercel application:

- `https://burn-nbyte.vercel.app/api/kroger/callback`

Public Wix legal URLs (currently configured as exact redirects to the Vercel legal pages):

- `https://www.burnnbyte.com/privacy`
- `https://www.burnnbyte.com/terms`

The database schema for OAuth credentials is introduced by
`20260908120000_add_retailer_oauth`. Review and deploy that migration before enabling the Connect
Kroger link in a deployed environment.

Retailer credentials and OAuth state are stored in provider-neutral tables keyed by user and
provider. Provider-specific authorization, scopes, token exchange, refresh behavior, and
capabilities live under `src/lib/retailers/`; Kroger is the only implemented adapter today.
