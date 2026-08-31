import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function normalizeDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

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

    const existingEntry = await prisma.weightHistory.findFirst({
      where: { profileId: profile.id, date },
      orderBy: { id: "asc" },
    });
    const entry = existingEntry
      ? await prisma.weightHistory.update({ where: { id: existingEntry.id }, data: { weight } })
      : await prisma.weightHistory.create({
          data: {
            profileId: profile.id,
            weight,
            date,
          },
        });

    const latestEntry = await prisma.weightHistory.findFirst({
      where: { profileId: profile.id },
      orderBy: { date: "desc" },
    });
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { weight: latestEntry?.weight ?? null },
    });

    return NextResponse.json({ ok: true, entry, currentWeight: latestEntry?.weight ?? null });
  } catch (err) {
    console.error("weight entry failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const entryId = new URL(req.url).searchParams.get("id");
    if (!entryId) {
      return NextResponse.json({ error: "Weight entry id is required" }, { status: 400 });
    }

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const entry = await prisma.weightHistory.findFirst({
      where: { id: entryId, profileId: profile.id },
    });
    if (!entry) {
      return NextResponse.json({ error: "Weight entry not found" }, { status: 404 });
    }

    await prisma.weightHistory.delete({ where: { id: entry.id } });
    const latestEntry = await prisma.weightHistory.findFirst({
      where: { profileId: profile.id },
      orderBy: { date: "desc" },
    });
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { weight: latestEntry?.weight ?? null },
    });

    return NextResponse.json({ ok: true, deletedId: entry.id, currentWeight: latestEntry?.weight ?? null });
  } catch (err) {
    console.error("weight entry delete failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
