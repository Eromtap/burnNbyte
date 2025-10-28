import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import GenerateMealPlan from "@/components/GenerateMealPlan";
import Link from "next/link";
import DateStrip from "@/components/DateStrip";
import MealsReplacerSingle from "@/components/MealsReplacerSingle";

function toYMDLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}

export default async function MealsPage({ searchParams }){
  const session = await requireAuth();
  // Optional onboarding check to match home page
  const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
  if (!profile) redirect('/onboarding/1');

  const todayLocal = new Date(); todayLocal.setHours(0,0,0,0);
  const selectedISO = searchParams?.date ? String(searchParams.date) : toYMDLocal(todayLocal);
  const baseUtc = toUTCDateFromLocalYMD(selectedISO);

  const mealPlan = await prisma.mealPlan.findFirst({ where: { userId: session.user.id, date: baseUtc }, include: { meals: true } });

  const grouped = (mealPlan?.meals || []).reduce((acc,m)=>{
    const t = (m.type||'').toLowerCase();
    acc[t] = acc[t] || [];
    acc[t].push(m);
    return acc;
  }, {});

  return (
    <main>
      <div className="stack">
        <DateStrip basePath="/meals" selectedISO={selectedISO} />
        <article className="card">
          <header className="card-head">
            <h3>Generate Meal Plan</h3>
            <div className="sub">Creates plans and saves to calendar</div>
          </header>
          <GenerateMealPlan />
          <div className="list-row" style={{marginTop:8}}>
            <a className="pill" href="/pantry" style={{marginLeft:8}}>Use Pantry Photo</a>
          </div>
        </article>

        <article className="card">
          <header className="card-head">
            <h3>Meal Plan</h3>
            <div className="sub">{mealPlan ? new Date(mealPlan.date).toDateString() : 'No plan on this day'}</div>
          </header>
          {!mealPlan && <div className="muted">No meal plan for today. Use the button above to generate.</div>}
          {mealPlan && (
            <div className="stack">
              {['breakfast','lunch','dinner','snack'].map((type) => (
                <div key={type} className="planner-col">
                  <div className="planner-head" style={{textTransform:'capitalize'}}>{type}</div>
                  <div>
                    {(grouped[type]||[]).map(m => (
                      <article key={m.id} className="card" style={{ marginTop: 8 }}>
                        <header className="card-head">
                          <h3>{m.name}</h3>
                          <div className="sub">{m.calories ?? '—'} kcal</div>
                        </header>
                        <div className="stack">
                          {Array.isArray(m.ingredients) && m.ingredients.length > 0 && (
                            <div>
                              <div className="planner-head">Ingredients</div>
                              <ul className="list" style={{ marginTop: 8 }}>
                                {m.ingredients.map((ing, i) => (<li key={i} className="list-row"><span>{ing}</span></li>))}
                              </ul>
                            </div>
                          )}
                          {m.recipe && (
                            <div>
                              <div className="planner-head">Recipe</div>
                              <div className="list-row"><span style={{whiteSpace:'pre-wrap'}}>{m.recipe}</span></div>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                    {!(grouped[type]||[]).length && <div className="muted">No {type} planned.</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
        
        <article className="card">
          <header className="card-head">
            <h3>Replace Meal for Day</h3>
            <div className="sub">Pick one meal to swap for this day</div>
          </header>
          <MealsReplacerSingle selectedISO={selectedISO} />
        </article>
      </div>
    </main>
  );
}
