import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

function toUTC(ymd){
  const [y,m,d] = String(ymd||'').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}

export async function POST(req){
  try{
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
    const body = await req.json();
    const { date, type, mode = 'replace', meal } = body || {};
    if (!date || !type || !meal || !meal.name) return NextResponse.json({ error:'Missing required fields' }, { status:400 });
    const dayUtc = toUTC(date);
    if (!dayUtc) return NextResponse.json({ error:'Invalid date' }, { status:400 });

    const userId = String(session.user.id);

    const plan = await prisma.mealPlan.findFirst({ where:{ userId, date: dayUtc } });
    const mealPlan = plan ?? await prisma.mealPlan.create({ data:{ userId, date: dayUtc, title: `Meal Plan ${date}`, description:'' } });

    // Optionally replace existing meal(s) of the same type
    if (mode === 'replace'){
      await prisma.meal.deleteMany({ where:{ mealPlanId: mealPlan.id, type } });
    }

    const created = await prisma.meal.create({
      data: {
        mealPlanId: mealPlan.id,
        name: meal.name,
        type,
        calories: Number(meal.calories) || null,
        costPerServing: meal.costPerServing != null ? Number(meal.costPerServing) : null,
        protein: meal.protein != null ? Number(meal.protein) : null,
        carbs: meal.carbs != null ? Number(meal.carbs) : null,
        fat: meal.fat != null ? Number(meal.fat) : null,
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
        recipe: meal.recipe || ''
      }
    });

    return NextResponse.json({ ok:true, mealId: created.id, mealPlanId: mealPlan.id });
  } catch(err){
    console.error('apply meal error', err);
    return NextResponse.json({ error:'Server error' }, { status:500 });
  }
}
