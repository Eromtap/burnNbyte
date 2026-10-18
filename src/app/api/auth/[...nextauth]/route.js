import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { resolveGoogleAccount } from "@/lib/googleAccount";
import { GOOGLE_NONCE_COOKIE, readNativeGoogleChallenge, verifyNativeGoogleIdentity } from "@/lib/googleNative";

function isRetryablePrismaError(error) {
  if (!error) return false;

  const name = typeof error.name === "string" ? error.name : "";
  const message = typeof error.message === "string" ? error.message : "";

  return (
    name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server") ||
    message.includes("Please make sure your database server is running")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withPrismaRetry(operation, { retries = 2, delayMs = 750 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (attempt > retries || !isRetryablePrismaError(error)) {
        throw error;
      }

      await sleep(delayMs * attempt);
    }
  }
}


export const authOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [CredentialsProvider({
      id: 'google-native',
      name: 'Google on Android',
      credentials: { idToken: { type: 'text' } },
      async authorize(credentials, req) {
        try {
          const challenge = readNativeGoogleChallenge(req);
          if (!challenge) {
            console.warn('Native Google sign-in rejected', { reason: 'missing_challenge_cookie' });
            return null;
          }
          const profile = await verifyNativeGoogleIdentity(credentials?.idToken, challenge);
          if (!profile) {
            console.warn('Native Google sign-in rejected', { reason: 'invalid_identity_or_challenge' });
            return null;
          }
          const user = await withPrismaRetry(() => resolveGoogleAccount(profile));
          return { id: String(user.id), name: user.name, email: user.email };
        } catch (error) {
          if (error.message === 'GoogleAccountExists') throw new Error('GoogleAccountExists');
          console.error('Native Google sign-in failed', { name: error.name, code: error.code });
          return null;
        }
      },
    })] : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    ] : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email?.trim().toLowerCase();
          const password = credentials?.password;
          if (!email || !password) return null;

          const user = await withPrismaRetry(() => prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true, name: true, email: true, password: true, isAdmin: true, termsAcceptedAt: true },
          }));
          if (!user?.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            isAdmin: Boolean(user.isAdmin),
            termsAcceptedAt: user.termsAcceptedAt,
          };
        } catch (err) {
          console.error("Auth authorize error", err);
          return null;
        }
      },
    }),
  ],
  pages: { signIn: "/signin", error: "/signin" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (profile?.email_verified !== true || !profile?.sub || !profile?.email) return false;

      const operation = "resolveGoogleAccount";
      try {
        const dbUser = await withPrismaRetry(() => resolveGoogleAccount(profile));
        user.id = String(dbUser.id);
        user.name = dbUser.name;
        user.email = dbUser.email;
        return true;
      } catch (error) {
        if (error.message === "GoogleAccountExists") return "/signin?error=GoogleAccountExists";
        let databaseHost = "unavailable";
        try {
          databaseHost = new URL(process.env.DATABASE_URL).hostname;
        } catch {
          // Do not log connection strings or credentials when parsing fails.
        }
        console.error("Google sign-in failed", {
          name: error.name,
          code: error.code,
          operation,
          databaseHost,
          model: error.meta?.modelName,
          column: error.meta?.column,
          clientVersion: error.clientVersion,
        });
        return "/signin?error=GoogleSignInFailed";
      }
    },
    async jwt({ token, user, trigger }) {
      // establish a stable user id in the token
      const userId = user?.id ?? token.id ?? token.sub ?? null;
      if (userId) token.id = userId;
      if (!userId) {
        token.preferences = null;
        token.authzHydrated = false;
        return token;
      }

      const shouldHydrate = Boolean(user) || trigger === "update" || !token.authzHydrated;
      if (!shouldHydrate) return token;

      const [dbUser, profile] = await Promise.all([
        withPrismaRetry(() => prisma.user.findUnique({
          where: { id: String(userId) },
          select: { isAdmin: true, termsAcceptedAt: true },
        })),
        withPrismaRetry(() => prisma.userProfile.findUnique({
          where: { userId: String(userId) },
        })),
      ]);

      token.isAdmin = Boolean(dbUser?.isAdmin ?? user?.isAdmin);
      token.termsAcceptedAt = dbUser?.termsAcceptedAt ?? user?.termsAcceptedAt ?? null;
      token.preferences = profile ?? null;
      token.authzHydrated = true;

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id ?? token.sub ?? null;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.termsAcceptedAt = token.termsAcceptedAt ?? null;
        session.user.authzHydrated = Boolean(token.authzHydrated);
        session.user.preferences = token.preferences ?? null;
      }
      return session;
    },
  },





};

const handler = NextAuth(authOptions);
export { handler as GET };
export async function POST(request, context) {
  const response = await handler(request, context);
  if (new URL(request.url).pathname.endsWith('/callback/google-native')) {
    response.headers.append('Set-Cookie', `${GOOGLE_NONCE_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }
  return response;
}
