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

## Email verification

New accounts must verify their email before signing in, and their 14-day trial begins when verification succeeds. Transactional email is sent through Resend; its free tier currently includes 3,000 emails per month, with a 100-email daily limit. Set these server-only values in `.env`:

```bash
RESEND_EMAIL_API_KEY=re_...
EMAIL_FROM="BurnnByte <verify@auth.your-domain.example>"
EMAIL_REPLY_TO=support@your-domain.example
APP_URL=https://your-domain.example
```

Add and verify the sending domain (a dedicated subdomain such as `auth.your-domain.example` is recommended) in Resend, then add its DNS records at your DNS host. This can coexist with Proton Mail: leave existing Proton MX records unchanged and add only the records Resend requests. `EMAIL_REPLY_TO` can point to the Proton inbox that should receive customer replies. Deploy the migrations with `npm run migrate:deploy`.

## Mobile Wrapper

The mobile app lives in `apps/mobile` and wraps the hosted web app with Capacitor.

Useful commands:

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
```

Set `CAPACITOR_SERVER_URL` in `apps/mobile/.env` to the same public HTTPS origin used by production `APP_URL`. Verification and password-reset links open safely in a desktop or mobile browser and update the shared account in the database; mobile users can then return to the app and sign in.
