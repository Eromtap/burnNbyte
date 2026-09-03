import { NextResponse } from 'next/server';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sanitizeMealPayload } from '@/lib/mealPlanUtils';

function toUTC(ymd) {
  const [year, month, day] = String(ymd || '').slice(0, 10).split('-').map(Number);
  return year && month && day ? new Date(Date.UTC(year, month - 1, day)) : null;
}

export async function GET(req) {
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const date = toUTC(new URL(req.url).searchParams.get('date'));
  if (!date) return NextResponse.json({ error: 'Choose a date.' }, { status: 400 });
  const entries = await prisma.foodLogEntry.findMany({ where: { userId: auth.session.user.id, date }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ entries });
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const body = await req.json();
    const date = toUTC(body?.date);
    if (!date) return NextResponse.json({ error: 'Choose a date.' }, { status: 400 });
    const meal = sanitizeMealPayload(body?.meal || {});
    // Recipe-yield fields belong to planned meals and grocery scaling, not a
    // one-off food log.
    const { recipeYield: _recipeYield, cookServings: _cookServings, ...foodLogData } = meal;
    const completed = body?.completed !== false;
    const entry = await prisma.foodLogEntry.create({ data: { userId: auth.session.user.id, date, ...foodLogData, isCompleted: completed, completedAt: completed ? new Date() : null } });
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to save food log.' }, { status: 500 });
  }
}
