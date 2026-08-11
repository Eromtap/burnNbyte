import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  
  callbacks: {
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
