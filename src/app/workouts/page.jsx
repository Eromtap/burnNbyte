import { requireAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import WorkoutsPageClient from "@/components/WorkoutsPageClient";

function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}
function toYMDInTimeZone(date, timeZone){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function resolveTimeZone(candidate){
  try {
    if (candidate) {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    }
  } catch (_err) {
    // ignore and fall back
  }
  return 'UTC';
}

export default async function WorkoutsPage({ searchParams: searchParamsPromise }){
  const searchParams = await searchParamsPromise;
  const resolveDateParam = () => {
    if (!searchParams) return undefined;
    if (typeof searchParams.get === 'function') {
      return searchParams.get('date') || undefined;
    }
    const raw = searchParams?.date;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get('x-vercel-ip-timezone') ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const { session } = await requireAppSession();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const dateParam = resolveDateParam();
  const selectedISO = dateParam ? String(dateParam) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const workout = await prisma.workout.findFirst({ where: { userId: session.user.id, date: baseUtc } });
  const exerciseLogs = workout
    ? await prisma.exerciseLog.findMany({
        where: { workoutId: workout.id, userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <main>
      <div className="page-shell stack">
        <WorkoutsPageClient
          profile={profile}
          initialSelectedISO={selectedISO}
          initialWorkout={workout}
          initialExerciseLogs={exerciseLogs}
        />
      </div>
    </main>
  );
}
