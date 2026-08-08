import { requireAppSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getSessionUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GroceryOptimizer from '@/components/GroceryOptimizer';
import RawGroceryList from '@/components/RawGroceryList';
import DateStrip from '@/components/DateStrip';
import StoreReadyList from '@/components/StoreReadyList';

function toYMDLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseYMDLocal(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(y, (m||1)-1, d||1);
}
function startOfWeekLocal(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const dow = x.getDay();
  x.setDate(x.getDate() - dow);
  return x;
}
function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}
function addDaysUTC(d, n){ const x = new Date(d); x.setUTCDate(x.getUTCDate()+n); return x; }
function normalizeStoreItems(items = [], summaryId){
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    id: it?.id || `${summaryId || 'item'}-${idx}`,
    name: it?.name || `Item ${idx + 1}`,
    quantity: typeof it?.quantity === 'number' ? it.quantity : Number(it?.quantity) || 0,
    unit: it?.unit || '',
    packageSize: it?.packageSize || '',
    notes: it?.notes || '',
    checked: Boolean(it?.checked),
  }));
}

export default async function GroceriesPage({ searchParams }) {
  const { session } = await requireAppSession();
  const profile = await getSessionUserProfile(session);
  if (!profile) redirect('/onboarding/1');

  const todayLocal = new Date(); todayLocal.setHours(0,0,0,0);
  const params = await searchParams; // async-compatible searchParams (may be URLSearchParams)
  const paramDate = typeof params?.get === 'function' ? params.get('date') : params?.date;
  const selectedISO = paramDate ? String(paramDate) : toYMDLocal(todayLocal);
  const selectedLocal = parseYMDLocal(selectedISO);
  const startOfWeek = startOfWeekLocal(selectedLocal);
  const start = toUTCDateFromLocalYMD(toYMDLocal(startOfWeek));
  const end = addDaysUTC(start, 6);

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id, date: { gte: start, lte: end } },
    include: { meals: true },
    orderBy: { date: 'asc' },
  });

  // Load any existing cached store-ready list for this week (most recent)
  let cached = null;
  try {
    cached = await prisma.grocerySummary.findFirst({
      where: { userId: session.user.id, start, end },
      orderBy: { updatedAt: 'desc' },
    });
  } catch {}

  const summary = cached ? { ...cached, items: normalizeStoreItems(cached.items, cached.id), archivedItems: normalizeStoreItems(cached.archivedItems || [], cached.id) } : null;

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
  const displayRangeLabel = `${startOfWeek.toLocaleDateString()} - ${addDaysUTC(start, 6).toLocaleDateString()}`;

  return (
    <main className="bn-route-page bn-groceries-page">
      <div className="page-shell">
        <div className="stack">
          <DateStrip basePath="/groceries" selectedISO={selectedISO} />
          <section className="bn-route-intro">
            <div>
              <div className="eyebrow">Weekly provisions</div>
              <h1>Shop the week,<br /><em>not the aisle.</em></h1>
              <p>Everything your meal plan needs, consolidated into one practical store run.</p>
            </div>
            <aside>
              <span>Current window</span>
              <strong>{displayRangeLabel}</strong>
              <small>{items.length} raw ingredient{items.length === 1 ? '' : 's'} in the plan</small>
            </aside>
          </section>
          {summary && (
            <StoreReadyList
              summaryId={summary.id}
              items={summary.items}
              archivedItems={summary.archivedItems}
              unitSystem={summary.unitSystem}
              updatedAt={summary.updatedAt}
              clearedAt={summary.clearedAt}
              archivedAt={summary.archivedAt}
            />
          )}

          <article className="card bn-route-stage">
            <header className="card-head">
              <h3>AI Optimization</h3>
              <div className="sub">Combine items and convert to store units</div>
            </header>
            <GroceryOptimizer selectedISO={selectedISO} />
          </article>

          <article className="card bn-route-stage">
            <header className="card-head">
              <h3>Raw Ingredients</h3>
              <div className="sub">Direct from meal plans</div>
            </header>
            <RawGroceryList items={items} rangeLabel={displayRangeLabel} />
          </article>
        </div>
      </div>
    </main>
  );
}
