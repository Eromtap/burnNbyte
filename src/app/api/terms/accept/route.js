import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const auth = await requireAppApiSession({ allowWithoutTerms: true });
    if (auth.response) return auth.response;
    const { session } = auth;

    const user = await prisma.user.findUnique({
      where: { id: String(session.user.id) },
      select: { id: true, termsAcceptedAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.termsAcceptedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { termsAcceptedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("terms acceptance failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
