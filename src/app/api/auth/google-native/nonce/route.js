import { randomBytes } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { GOOGLE_NONCE_COOKIE } from '@/lib/googleNative';

export async function POST() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!clientId || !secret) return NextResponse.json({ error: 'Google sign-in unavailable' }, { status: 503 });
  const nonce = randomBytes(32).toString('base64url');
  const token = await encode({ secret, token: { nonce, purpose: 'google-native' }, maxAge: 300 });
  const response = NextResponse.json({ nonce, clientId }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(GOOGLE_NONCE_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/api/auth', maxAge: 300,
  });
  return response;
}
