import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function normalizeDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) || {};
    const weight = Number(body?.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    }
    const date = normalizeDate(body?.date);

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const entry = await prisma.weightHistory.create({
      data: {
        profileId: profile.id,
        weight,
        date,
      },
    });

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { weight },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("weight entry failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
