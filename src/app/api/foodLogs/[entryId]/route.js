import { NextResponse } from 'next/server';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req, { params }) {
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const { entryId } = await params;
  const existing = await prisma.foodLogEntry.findFirst({ where: { id: String(entryId), userId: auth.session.user.id } });
  if (!existing) return NextResponse.json({ error: 'Food log not found.' }, { status: 404 });
  const completed = Boolean((await req.json())?.completed);
  const entry = await prisma.foodLogEntry.update({ where: { id: existing.id }, data: { isCompleted: completed, completedAt: completed ? new Date() : null } });
  return NextResponse.json({ entry });
}
