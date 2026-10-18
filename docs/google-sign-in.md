# Google sign-in

Web and Android use the same Google subject (`User.googleSubject`) as the account
identity. Existing password accounts are not linked just by matching email.

## Server configuration

- `GOOGLE_CLIENT_ID`: the Web OAuth client ID, used as the Android ID-token audience too.
- `GOOGLE_CLIENT_SECRET`: Web OAuth secret; server only.
- `NEXTAUTH_SECRET`: session encryption and native challenge encryption.
- `NEXTAUTH_URL`: the deployment's canonical HTTPS URL.
- Apply `20261018160000_add_google_sign_in` to the database actually used by the deployment.

## Android OAuth registration

Google Cloud project: BurnNByte. Android OAuth client:
`676307044503-1b76cb7fqd09j2blp0s9j2k2hroec5h5.apps.googleusercontent.com`

Package: `com.burnnbyte.app`. Play app-signing SHA-1:
`F8:5E:D7:81:2F:B2:36:D6:D1:AD:20:01:FD:18:80:0D:E9:E7:6B:D5`.

The Android client is registered with Google; its ID is not the server token
audience. Local/debug APKs require separate Android OAuth registrations for
their signing certificates. Test this release through Google Play internal testing.

The app's custom Capacitor plugin uses Credential Manager's explicit Google
button flow. The server issues a five-minute encrypted, HttpOnly cookie challenge
and verifies Google ID-token signature, issuer, audience, expiry, verified email,
and nonce before establishing a regular NextAuth session. The challenge cookie
is cleared on the native login callback. Tokens are not stored on the device.

The Google button stays hidden in older Android bundles lacking the plugin and
in iOS until its native flow is implemented. Android logout clears Credential
Manager state as well as the BurnNByte session.

## Staging test build

From the repository root:

```sh
CAPACITOR_SERVER_URL=https://burn-nbyte-git-staging-mark-patmores-projects.vercel.app npm run mobile:sync
cd apps/mobile/android
./gradlew bundleRelease
```

Use the ignored local upload key and `keystore.properties`. Increase `versionCode`
for each Play upload. Deploy the server changes to staging before installing the
new bundle. Production builds must sync using the production server URL instead.

Check: new Google user → terms → onboarding; returning Google user → existing
account; existing password email → use password; canceled picker → retry;
logout → account chooser on next login. Physical-device testing is required.
