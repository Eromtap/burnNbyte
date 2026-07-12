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
          const email = credentials?.email?.trim();
          const password = credentials?.password;
          if (!email || !password) return null;

          const user = await withPrismaRetry(() => prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true, isAdmin: true },
          }));
          if (!user?.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            isAdmin: Boolean(user.isAdmin),
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
    async jwt({ token, user }) {
      // establish a stable user id in the token
      const userId = user?.id ?? token.id ?? token.sub ?? null;
      if (userId) token.id = userId;
      if (typeof user?.isAdmin === "boolean") {
        token.isAdmin = user.isAdmin;
      } else if (userId) {
        const dbUser = await withPrismaRetry(() =>
          prisma.user.findUnique({
            where: { id: String(userId) },
            select: { isAdmin: true },
          })
        );
        token.isAdmin = Boolean(dbUser?.isAdmin);
      }

      // ALWAYS re-hydrate preferences if we know the userId
      if (userId) {
        token.preferences = await withPrismaRetry(() =>
          prisma.userProfile.findUnique({
            where: { userId: String(userId) },
          })
        );
      } else {
        token.preferences = null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id ?? token.sub ?? null;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.preferences = token.preferences ?? null;
      }
      return session;
    },
  },





};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
