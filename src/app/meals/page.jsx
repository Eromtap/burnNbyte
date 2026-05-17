import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import MealsPageClient from "@/components/MealsPageClient";
import { buildMealFeedbackMap } from "@/lib/mealFeedback";

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}
function toYMDInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function resolveTimeZone(candidate) {
  try {
    if (candidate) {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    }
  } catch (_err) {
    // ignore, fall back to UTC
  }
  return "UTC";
}

export default async function MealsPage({ searchParams }){
  const headerStore = await headers();
  const timeZoneCandidate =
    headerStore.get("x-vercel-ip-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const timeZone = resolveTimeZone(timeZoneCandidate);

  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect("/onboarding/1");

  const todayISO = toYMDInTimeZone(new Date(), timeZone);
  const params = await searchParams;
  const paramDate = typeof params?.get === "function" ? params.get("date") : params?.date;
  const selectedISO = paramDate ? String(paramDate) : todayISO;
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const [mealPlan, libraryItems] = await Promise.all([
    prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: baseUtc }, include: { meals: true } }),
    prisma.mealLibraryItem.findMany({
      where: { userId: session.user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 24,
    }),
  ]);
  const canReadMealFeedback = typeof prisma.mealFeedback?.findMany === "function";
  const feedbackRows = canReadMealFeedback && mealPlan?.meals?.length
    ? await prisma.mealFeedback.findMany({
        where: {
          userId: session.user.id,
          OR: mealPlan.meals.map((meal) => ({ mealName: meal.name, mealType: meal.type })),
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const mealFeedback = buildMealFeedbackMap(feedbackRows);

  return (
    <main>
      <div className="page-shell stack">
        <MealsPageClient
          profile={profile}
          initialSelectedISO={selectedISO}
          initialMealPlan={mealPlan}
          initialMealFeedback={mealFeedback}
          initialLibraryItems={libraryItems}
        />
      </div>
    </main>
  );
}
