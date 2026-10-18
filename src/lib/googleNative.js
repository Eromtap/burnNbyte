import { OAuth2Client } from 'google-auth-library';
import { decode } from 'next-auth/jwt';

export const GOOGLE_NONCE_COOKIE = 'bn-google-nonce';
const googleClient = new OAuth2Client();

export async function verifyNativeGoogleIdentity(idToken, challenge) {
  if (typeof idToken !== 'string' || idToken.length > 16000 || !challenge) return null;
  const audience = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!audience || !secret) return null;
  const state = await decode({ token: challenge, secret });
  if (state?.purpose !== 'google-native' || !state?.nonce) return null;
  const ticket = await googleClient.verifyIdToken({ idToken, audience });
  const profile = ticket.getPayload();
  if (profile?.nonce !== state.nonce || profile?.email_verified !== true || !profile?.sub || !profile?.email) return null;
  return profile;
}
