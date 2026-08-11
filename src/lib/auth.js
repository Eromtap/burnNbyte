// /lib/auth.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserAppAccess } from "@/lib/access";

export async function requireAuth(options = {}) {
  const { allowWithoutTerms = false } = options;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");
  if (!allowWithoutTerms && session.user?.authzHydrated) {
    if (!session.user.termsAcceptedAt) redirect("/terms");
  } else if (!allowWithoutTerms) {
    const user = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: { termsAcceptedAt: true },
    });
    if (!user?.termsAcceptedAt) redirect("/terms");
  }
  return session;
}

export async function isAdminSession(session) {
  const userId = session?.user?.id;
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { isAdmin: true },
  });

  return Boolean(user?.isAdmin);
}

export async function requireAdmin(options = {}) {
  const session = await requireAuth(options);
  if (!(await isAdminSession(session))) {
    redirect("/");
  }
  return session;
}

export async function requireAppSession(options = {}) {
  const session = await requireAuth(options);
  const access = await getUserAppAccess(session.user.id);

  if (!access.hasAppAccess) {
    redirect("/expired");
  }

  return { session, access };
}

export async function getSessionUserProfile(session) {
  const cachedProfile = session?.user?.preferences;
  if (cachedProfile?.id) return cachedProfile;
  if (!session?.user?.id) return null;
  return prisma.userProfile.findUnique({
    where: { userId: String(session.user.id) },
  });
}

export async function requireAppApiSession(options = {}) {
  const { allowWithoutTerms = false } = options;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!allowWithoutTerms && session.user?.authzHydrated) {
    if (!session.user.termsAcceptedAt) {
      return {
        response: NextResponse.json({ error: "Terms acceptance required" }, { status: 403 }),
      };
    }
  } else if (!allowWithoutTerms) {
    const user = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: { termsAcceptedAt: true },
    });

    if (!user?.termsAcceptedAt) {
      return {
        response: NextResponse.json({ error: "Terms acceptance required" }, { status: 403 }),
      };
    }
  }

  const access = await getUserAppAccess(session.user.id);
  if (!access.hasAppAccess) {
    return {
      response: NextResponse.json(
        {
          error: "Access expired",
          accessState: access.accessState,
          expiresAt: access.expiresAt,
        },
        { status: 403 }
      ),
    };
  }

  return { session, access };
}
