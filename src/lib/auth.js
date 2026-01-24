// /lib/auth.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function requireAuth(options = {}) {
  const { allowWithoutTerms = false } = options;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");
  if (!allowWithoutTerms) {
    const user = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: { termsAcceptedAt: true },
    });
    if (!user?.termsAcceptedAt) redirect("/terms");
  }
  return session;
}
