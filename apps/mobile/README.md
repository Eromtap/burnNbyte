# BurnnByte Mobile

This app is a Capacitor shell for the hosted BurnnByte web app.

## Configure the target URL

Create `apps/mobile/.env` from `.env.example` and set:

```bash
CAPACITOR_SERVER_URL=https://your-deployed-app.example.com
```

Use an `https://` production URL for App Store and Play Store builds. During local Android emulator testing, a typical value is `http://10.0.2.2:3000`.

The production `CAPACITOR_SERVER_URL` must use the same public origin as the web app's production `APP_URL`. Email verification and password-reset links use `APP_URL`; they normally open in the device's default browser, complete the server-side account action there, and then direct the user to return to the BurnnByte app to sign in. No browser cookie transfer is required.

## Common commands

```bash
npm install
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
```

After adding a native platform once, open it with:

```bash
npm --workspace apps/mobile run open:android
npm --workspace apps/mobile run open:ios
```

## Architecture

- The Next.js app remains the source of truth.
- Capacitor wraps that hosted app inside a native WebView.
- Desktop browsers and the mobile wrapper use the same verification and password-reset routes.
- Native features can be added incrementally later through Capacitor plugins.
