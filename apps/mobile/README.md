# BurnnByte Mobile

This app is a Capacitor shell for the hosted BurnnByte web app.

## Configure the target URL

Create `apps/mobile/.env` from `.env.example` and set:

```bash
CAPACITOR_SERVER_URL=https://your-deployed-app.example.com
```

Use an `https://` production URL for App Store and Play Store builds. During local Android emulator testing, a typical value is `http://10.0.2.2:3000`.

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
- Native features can be added incrementally later through Capacitor plugins.
