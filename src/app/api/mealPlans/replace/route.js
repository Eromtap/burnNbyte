import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { describeDietaryPreferences } from '@/constants/dietaryPreferences';

function toUTC(ymd){
  const [y,m,d] = String(ymd||'').split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}

export async function POST(req){
  try{
    const session = await getServerSession(authOptions);
    if(!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const rebalance = Boolean(body?.rebalance);
    if(!items.length) return NextResponse.json({ error: 'No items to replace' }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const prefs = {
      dietaryPreferences: Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : [],
      allergies: typeof profile?.allergies === 'string' ? profile.allergies.split(',').map(s=>s.trim()).filter(Boolean) : (Array.isArray(profile?.allergies) ? profile.allergies : []),
      fitnessGoal: profile?.fitnessGoal || null,
      mealsPerDay: profile?.mealsPerDay || 4,
    };
    const dietPrompt = describeDietaryPreferences(prefs.dietaryPreferences);
    const dietForPrompt = dietPrompt.length ? dietPrompt : prefs.dietaryPreferences;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const REPLACE_SCHEMA = {
      name: 'partial_meals',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['meals'],
        properties: {
          meals: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name','type','calories','protein','carbs','fat','ingredients','recipe'],
              properties: {
                name:{ type:'string' },
                type:{ enum: ['breakfast','lunch','dinner','snack'] },
                calories:{ anyOf:[{type:'integer'},{type:'number'}] },
                protein:{ anyOf:[{type:'integer'},{type:'number'}] },
                carbs:{ anyOf:[{type:'integer'},{type:'number'}] },
                fat:{ anyOf:[{type:'integer'},{type:'number'}] },
                ingredients:{ type:'array', items:{ type:'string' } },
                recipe:{ type:'string' }
              }
            }
          }
        }
      }
    };

    const results = [];
    for(const { date, types } of items){
      const dayUtc = toUTC(date);
      const plan = await prisma.mealPlan.findFirst({ where:{ userId: session.user.id, date: dayUtc }, include:{ meals:true } });
      if(!plan){
        // create empty plan shell
        await prisma.mealPlan.create({ data: { userId: session.user.id, date: dayUtc, title: `Meal Plan ${date}`, description: '' } });
      }

      if(rebalance){
        // Regenerate full day using generateMealPlan-like behavior with single date
        const prompt = {
          role: 'user',
          content: `Create a complete daily meal plan for ${date} with ${prefs.mealsPerDay} meals that respects: fitnessGoal=${JSON.stringify(prefs.fitnessGoal)}, preferences=${JSON.stringify(dietForPrompt)}, allergies=${JSON.stringify(prefs.allergies)}. Lean into the preferences wherever possible. Output JSON { meals:[...] } with the required meal fields; no prose. Recipe fields must contain 3-6 numbered cooking steps separated by line breaks so the cook has clear guidance.`,
        };
        const completion = await openai.chat.completions.create({ model:'gpt-4o-mini', messages:[prompt], response_format:{ type:'json_schema', json_schema: REPLACE_SCHEMA }, temperature:0.6 });
        let content = completion.choices?.[0]?.message?.content ?? '';
        if (content.trim().startsWith('```')) content = content.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
        let out; try { out = JSON.parse(content); } catch { return NextResponse.json({ error:'AI parse error' }, { status:502 }); }
        await prisma.$transaction(async (tx)=>{
          const existing = await tx.mealPlan.findFirst({ where:{ userId: session.user.id, date: dayUtc } });
          if (!existing) return;
          await tx.meal.deleteMany({ where:{ mealPlanId: existing.id } });
          if (Array.isArray(out.meals) && out.meals.length){
            await tx.meal.createMany({ data: out.meals.map(m=>({ mealPlanId: existing.id, name:m.name, type:m.type, calories:Number(m.calories)||null, protein:Number(m.protein)||null, carbs:Number(m.carbs)||null, fat:Number(m.fat)||null, ingredients:Array.isArray(m.ingredients)?m.ingredients:[], recipe:m.recipe||'' })) });
          }
        });
      } else {
        // Replace only selected meal types
        const fixed = (plan?.meals||[]).filter(m=> !types?.includes(m.type)).map(m=>({ name:m.name, type:m.type, calories:m.calories, protein:m.protein, carbs:m.carbs, fat:m.fat }));
        const prompt = {
          role: 'user',
          content: `Propose replacement meals for ${date} for these types: ${JSON.stringify(types)}. Keep daily calories roughly consistent with remaining fixed meals: ${JSON.stringify(fixed)}. Respect fitnessGoal=${JSON.stringify(prefs.fitnessGoal)}, preferences=${JSON.stringify(dietForPrompt)}, allergies=${JSON.stringify(prefs.allergies)}. Output ONLY JSON { meals:[...] } matching schema with exactly one meal per requested type. Recipe fields must contain 3-6 numbered cooking steps separated by line breaks so the cook can follow each meal.`
        };
        const completion = await openai.chat.completions.create({ model:'gpt-4o-mini', messages:[prompt], response_format:{ type:'json_schema', json_schema: REPLACE_SCHEMA }, temperature:0.5 });
        let content = completion.choices?.[0]?.message?.content ?? '';
        if (content.trim().startsWith('```')) content = content.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
        let out; try { out = JSON.parse(content); } catch { return NextResponse.json({ error:'AI parse error' }, { status:502 }); }
        await prisma.$transaction(async (tx)=>{
          const existing = await tx.mealPlan.findFirst({ where:{ userId: session.user.id, date: dayUtc } });
          if (!existing) return;
          await tx.meal.deleteMany({ where:{ mealPlanId: existing.id, type: { in: types } } });
          const toAdd = (out.meals||[]).filter(m=> types.includes(m.type));
          if (toAdd.length){
            await tx.meal.createMany({ data: toAdd.map(m=>({ mealPlanId: existing.id, name:m.name, type:m.type, calories:Number(m.calories)||null, protein:Number(m.protein)||null, carbs:Number(m.carbs)||null, fat:Number(m.fat)||null, ingredients:Array.isArray(m.ingredients)?m.ingredients:[], recipe:m.recipe||'' })) });
          }
        });
      }
      results.push({ date, ok:true });
    }

    return NextResponse.json({ ok:true, results });
  } catch(err){
    console.error('replace meals error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
