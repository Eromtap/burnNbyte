import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import GroceryOptimizer from '@/components/GroceryOptimizer';
import RawGroceryList from '@/components/RawGroceryList';

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDaysUTC(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export default async function GroceriesPage() {
  const session = await requireAuth();
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  const start = startOfTodayUTC();
  const end = addDaysUTC(start, 6);

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id, date: { gte: start, lte: end } },
    include: { meals: true },
    orderBy: { date: 'asc' },
  });

  const map = new Map();
  for (const p of plans) {
    for (const m of p.meals || []) {
      const ingredients = Array.isArray(m.ingredients) ? m.ingredients : [];
      for (const raw of ingredients) {
        const item = String(raw || '').trim();
        if (!item) continue;
        const key = item.toLowerCase();
        const prev = map.get(key);
        map.set(key, { item, count: (prev?.count || 0) + 1 });
      }
    }
  }

  const items = Array.from(map.values()).sort((a, b) => a.item.localeCompare(b.item));
  const rangeLabel = `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;

  return (
    <main>
      <div className="stack">
        <article className="card">
          <header className="card-head">
            <h3>AI Optimization</h3>
            <div className="sub">Combine items and convert to store units</div>
          </header>
          <GroceryOptimizer />
        </article>
        <article className="card">
          <header className="card-head">
            <h3>Raw Ingredients</h3>
            <div className="sub">Direct from meal plans</div>
          </header>
          <RawGroceryList items={items} rangeLabel={rangeLabel} />
        </article>
      </div>
    </main>
  );
}
