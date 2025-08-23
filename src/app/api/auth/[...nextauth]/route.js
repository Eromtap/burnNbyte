import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";



export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
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

      // ALWAYS re-hydrate preferences if we know the userId
      if (userId) {
        token.preferences = await prisma.userProfile.findUnique({
          where: { userId: String(userId) },
        });
      } else {
        token.preferences = null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id ?? token.sub ?? null;
        session.user.preferences = token.preferences ?? null;
      }
      return session;
    },
  },





};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
