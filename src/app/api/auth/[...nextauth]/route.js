import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

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

      const email = profile.email.trim().toLowerCase();
      const subject = profile.sub;
      let operation = "findGoogleAccount";
      try {
        let dbUser = await withPrismaRetry(() => prisma.user.findUnique({
          where: { googleSubject: subject },
        }));
        if (!dbUser) {
          // Matching email alone must not attach Google to an existing,
          // potentially unverified password account.
          operation = "findExistingEmail";
          const existing = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) return "/signin?error=GoogleAccountExists";
          operation = "createGoogleAccount";
          dbUser = await prisma.user.create({
            data: { email, name: profile.name || null, googleSubject: subject },
          });
        }
        user.id = String(dbUser.id);
        user.name = dbUser.name;
        user.email = dbUser.email;
        return true;
      } catch (error) {
        if (error.code === "P2002") return "/signin?error=GoogleAccountExists";
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
export { handler as GET, handler as POST };
