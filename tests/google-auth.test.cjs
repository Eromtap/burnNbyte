// Run: node --experimental-vm-modules --test tests/google-auth.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { encode, decode } = require('next-auth/jwt');

async function load(file, imports, globals = {}) {
  const context = vm.createContext({ ...globals });
  const module = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context });
  await module.link(async name => {
    const values = imports[name];
    assert.ok(values, `Unexpected import: ${name}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const profile = { sub: 'google-subject', email: 'Person@Example.com', email_verified: true, name: 'Person' };

test('returning Google identity uses existing user even if email changed', async () => {
  const existing = { id: 'app-user' };
  const mod = await load('src/lib/googleAccount.js', {
    '@/lib/prisma': { default: { user: { findUnique: async () => existing } } },
  });
  assert.equal(await mod.resolveGoogleAccount(profile), existing);
});

test('new Google user is created without password or implicit terms acceptance', async () => {
  let saved;
  const mod = await load('src/lib/googleAccount.js', {
    '@/lib/prisma': { default: { user: {
      findUnique: async () => null, findFirst: async () => null,
      create: async ({ data }) => { saved = data; return { id: 'new', ...data }; },
    } } },
  });
  const result = await mod.resolveGoogleAccount(profile);
  assert.equal(result.id, 'new');
  assert.equal(saved.email, 'person@example.com');
  assert.equal(saved.googleSubject, profile.sub);
  assert.equal(saved.password, undefined);
  assert.equal(saved.termsAcceptedAt, undefined);
});

test('matching password email cannot be automatically linked', async () => {
  const mod = await load('src/lib/googleAccount.js', {
    '@/lib/prisma': { default: { user: { findUnique: async () => null, findFirst: async () => ({ id: 'password-user' }) } } },
  });
  await assert.rejects(mod.resolveGoogleAccount(profile), /GoogleAccountExists/);
});

test('unverified identity is rejected before any database access', async () => {
  const mod = await load('src/lib/googleAccount.js', { '@/lib/prisma': { default: {} } });
  await assert.rejects(mod.resolveGoogleAccount({ ...profile, email_verified: false }), /GoogleIdentityInvalid/);
});

test('concurrent Google signups resolve to the same user', async () => {
  let reads = 0;
  const winner = { id: 'winner' };
  const mod = await load('src/lib/googleAccount.js', {
    '@/lib/prisma': { default: { user: {
      findUnique: async () => ++reads === 1 ? null : winner,
      findFirst: async () => null,
      create: async () => { throw Object.assign(new Error('unique constraint'), { code: 'P2002' }); },
    } } },
  });
  assert.equal(await mod.resolveGoogleAccount(profile), winner);
});

test('native identity requires a valid challenge, trusted audience and matching nonce', async () => {
  const secret = 'test-secret-never-used-outside-tests';
  let claims = { ...profile, nonce: 'nonce' };
  let verified = 0;
  const mod = await load('src/lib/googleNative.js', {
    'next-auth/jwt': { decode },
    'google-auth-library': { OAuth2Client: class {
      async verifyIdToken(options) {
        assert.equal(options.audience, 'web-client-id');
        if (options.idToken === 'invalid-signature') throw new Error('invalid signature');
        verified++;
        return { getPayload: () => claims };
      }
    } },
  }, { process: { env: { GOOGLE_CLIENT_ID: 'web-client-id', NEXTAUTH_SECRET: secret } } });
  const challenge = await encode({ secret, token: { purpose: 'google-native', nonce: 'nonce' }, maxAge: 300 });
  assert.equal(await mod.verifyNativeGoogleIdentity('id-token', null), null);
  assert.equal(verified, 0);
  assert.equal(await mod.verifyNativeGoogleIdentity('id-token', challenge), claims);
  claims = { ...profile, nonce: 'different' };
  assert.equal(await mod.verifyNativeGoogleIdentity('id-token', challenge), null);
  claims = { ...profile, nonce: 'nonce', email_verified: false };
  assert.equal(await mod.verifyNativeGoogleIdentity('id-token', challenge), null);
  await assert.rejects(mod.verifyNativeGoogleIdentity('invalid-signature', challenge), /invalid signature/);
  const expired = await encode({ secret, token: { purpose: 'google-native', nonce: 'nonce' }, maxAge: -60 });
  await assert.rejects(mod.verifyNativeGoogleIdentity('id-token', expired));
  await assert.rejects(mod.verifyNativeGoogleIdentity('id-token', 'tampered-challenge'));
});
