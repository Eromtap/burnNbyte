import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isAdminSession } from "@/lib/auth";
import { getUserAppAccess } from "@/lib/access";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function normalizeReason(reason) {
  if (!reason) return null;
  return String(reason).trim().toLowerCase();
}

function parseExpiresAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) return unauthorized();

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const userId = searchParams.get("userId")?.trim();

  if (!email && !userId) {
    return NextResponse.json({ error: "email or userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: email ? { email } : { id: userId },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [grants, access] = await Promise.all([
    prisma.userAccessGrant.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
    }),
    getUserAppAccess(user.id),
  ]);

  return NextResponse.json({ user, access, grants }, { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) return unauthorized();

  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const userId = body?.userId?.trim();

  if (!email && !userId) {
    return NextResponse.json({ error: "email or userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: email ? { email } : { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reason = normalizeReason(body?.reason);
  const notes = typeof body?.notes === "string" ? body.notes.trim() || null : null;
  const expiresAt = parseExpiresAt(body?.expiresAt);

  if (body?.expiresAt && !expiresAt) {
    return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
  }

  const grant = await prisma.userAccessGrant.create({
    data: {
      userId: user.id,
      accessLevel: "full_access",
      source: "manual",
      reason,
      expiresAt,
      grantedById: session.user.id ? String(session.user.id) : null,
      notes,
    },
  });

  const access = await getUserAppAccess(user.id);
  return NextResponse.json({ user, grant, access }, { status: 201 });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) return unauthorized();

  const body = await req.json().catch(() => null);
  const grantId = body?.grantId?.trim();

  if (!grantId) {
    return NextResponse.json({ error: "grantId is required" }, { status: 400 });
  }

  const existingGrant = await prisma.userAccessGrant.findUnique({
    where: { id: grantId },
    select: { id: true, userId: true },
  });

  if (!existingGrant) {
    return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  }

  await prisma.userAccessGrant.delete({
    where: { id: grantId },
  });

  const access = await getUserAppAccess(existingGrant.userId);
  return NextResponse.json({ ok: true, access }, { status: 200 });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!(await isAdminSession(session))) return unauthorized();

  const body = await req.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const userId = body?.userId?.trim();
  const isAdmin = body?.isAdmin;
  if ((!email && !userId) || typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "email or userId and isAdmin are required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: email ? { email } : { id: userId },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!isAdmin && String(user.id) === String(session.user?.id)) {
    return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  const access = await getUserAppAccess(updatedUser.id);
  return NextResponse.json({ user: updatedUser, access }, { status: 200 });
}
