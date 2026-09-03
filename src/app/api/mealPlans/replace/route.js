import { after, NextResponse } from 'next/server';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { describeDietaryPreferences } from '@/constants/dietaryPreferences';
import { describeFitnessGoals, normalizeFitnessGoals } from '@/constants/fitnessGoals';
import { summarizeMealFeedbackForPrompt } from '@/lib/mealFeedback';
import { deriveNutritionTargets } from '@/lib/nutritionTargets';
import { refreshStoreSummariesForDates } from '@/lib/grocerySummary';

function toUTC(ymd){
  const [y,m,d] = String(ymd||'').split('-').map(Number);
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}

export async function POST(req){
  try{
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const rebalance = Boolean(body?.rebalance);
    const includeInGroceries = body?.includeInGroceries !== false;
    if(!items.length) return NextResponse.json({ error: 'No items to replace' }, { status: 400 });

    const profile = await prisma.userProfile.findUnique({ where: { userId: String(session.user.id) } });
    const prefs = {
      dietaryPreferences: Array.isArray(profile?.dietaryPreferences) ? profile.dietaryPreferences : [],
      dislikedFoods: Array.isArray(profile?.dislikedFoods) ? profile.dislikedFoods : [],
      mealPrepMode: Boolean(profile?.mealPrepMode),
      allergies: typeof profile?.allergies === 'string' ? profile.allergies.split(',').map(s=>s.trim()).filter(Boolean) : (Array.isArray(profile?.allergies) ? profile.allergies : []),
      fitnessGoal: profile?.fitnessGoal || null,
      fitnessGoals: Array.isArray(profile?.fitnessGoals) ? profile.fitnessGoals : [],
      mealsPerDay: profile?.mealsPerDay || 4,
      macroTargetMode: profile?.macroTargetMode || 'grams',
      weight: profile?.weight ?? null,
      activityLevel: profile?.activityLevel || null,
      calorieTarget: profile?.calorieTarget ?? null,
      proteinTarget: profile?.proteinTarget ?? null,
      carbsTarget: profile?.carbsTarget ?? null,
      fatTarget: profile?.fatTarget ?? null,
      proteinPctTarget: profile?.proteinPctTarget ?? null,
      carbsPctTarget: profile?.carbsPctTarget ?? null,
      fatPctTarget: profile?.fatPctTarget ?? null,
    };
    const goalList = normalizeFitnessGoals(prefs.fitnessGoals ?? prefs.fitnessGoal);
    const goalFriendly = describeFitnessGoals(goalList);
    const goalForPrompt = goalFriendly.length ? goalFriendly : (goalList.length ? goalList : (prefs.fitnessGoal ? [prefs.fitnessGoal] : []));
    const dietPrompt = describeDietaryPreferences(prefs.dietaryPreferences);
    const dietForPrompt = dietPrompt.length ? dietPrompt : prefs.dietaryPreferences;
    const targetPrompt = deriveNutritionTargets(prefs);
    const mealFeedback = typeof prisma.mealFeedback?.findMany === 'function'
      ? await prisma.mealFeedback.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : [];
    const {
      dislikedMeals,
      likedMeals,
      recentLikedMeals,
    } = summarizeMealFeedbackForPrompt(mealFeedback);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });

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
              required: ['name','type','calories','costPerServing','protein','carbs','fat','ingredients','recipe','recipeYield'],
              properties: {
                name:{ type:'string' },
                type:{ enum: ['breakfast','lunch','dinner','snack'] },
                calories:{ anyOf:[{type:'integer'},{type:'number'}] },
                costPerServing:{ anyOf:[{type:'integer'},{type:'number'}] },
                protein:{ anyOf:[{type:'integer'},{type:'number'}] },
                carbs:{ anyOf:[{type:'integer'},{type:'number'}] },
                fat:{ anyOf:[{type:'integer'},{type:'number'}] },
                ingredients:{ type:'array', items:{ type:'string' } },
                recipe:{ type:'string' },
                recipeYield:{ type:'integer', minimum:1, maximum:12 }
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
          content: `Create a complete daily meal plan for ${date} with ${prefs.mealsPerDay} meals that respects: fitnessGoals=${JSON.stringify(goalForPrompt)}, preferences=${JSON.stringify(dietForPrompt)}, dislikedFoods (soft avoid)=${JSON.stringify(prefs.dislikedFoods)}, allergies=${JSON.stringify(prefs.allergies)}, mealPrepMode=${JSON.stringify(prefs.mealPrepMode)}, dailyTargets=${JSON.stringify(targetPrompt)}, dislikedMeals=${JSON.stringify(dislikedMeals)}, likedMealsOlderThan14Days=${JSON.stringify(likedMeals)}, recentLikedMealsAvoidRepeat=${JSON.stringify(recentLikedMeals)}. Lean into the preferences wherever possible. Treat dailyTargets as goals to get close to, not exact hard requirements. If dailyTargets.calories is provided, keep the day total close to it. If dailyTargets protein/carbs/fat are provided, keep the day's macros reasonably close while still producing realistic meals. If the user has a cost-conscious preference, favor lower-cost ingredients and budget-friendly meals. If mealPrepMode is true, prefer batch-cook meals that hold up for repeated weekday servings. If mealPrepMode is false, avoid exact repeats from recentLikedMealsAvoidRepeat. Include a realistic AI-estimated costPerServing in USD for every meal. recipeYield is required: it is the number of standard servings made by the full ingredient list, and calories/macros are per serving. Output JSON { meals:[...] } with the required meal fields; no prose. Recipe fields must contain 3-6 numbered cooking steps separated by line breaks so the cook has clear guidance.`,
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
            await tx.meal.createMany({ data: out.meals.map(m=>({ mealPlanId: existing.id, name:m.name, type:m.type, calories:Number(m.calories)||null, costPerServing:Number(m.costPerServing)||null, protein:Number(m.protein)||null, carbs:Number(m.carbs)||null, fat:Number(m.fat)||null, ingredients:Array.isArray(m.ingredients)?m.ingredients:[], recipe:m.recipe||'', recipeYield:Math.max(1, Math.round(Number(m.recipeYield)||1)), includeInGroceries })) });
          }
        });
      } else {
        // Replace only selected meal types
        const fixed = (plan?.meals||[]).filter(m=> !types?.includes(m.type)).map(m=>({ name:m.name, type:m.type, calories:m.calories, protein:m.protein, carbs:m.carbs, fat:m.fat }));
        const prompt = {
          role: 'user',
          content: `Propose replacement meals for ${date} for these types: ${JSON.stringify(types)}. Keep daily calories roughly consistent with remaining fixed meals: ${JSON.stringify(fixed)}. Respect fitnessGoals=${JSON.stringify(goalForPrompt)}, preferences=${JSON.stringify(dietForPrompt)}, dislikedFoods (soft avoid)=${JSON.stringify(prefs.dislikedFoods)}, allergies=${JSON.stringify(prefs.allergies)}, mealPrepMode=${JSON.stringify(prefs.mealPrepMode)}, dailyTargets=${JSON.stringify(targetPrompt)}, dislikedMeals=${JSON.stringify(dislikedMeals)}, likedMealsOlderThan14Days=${JSON.stringify(likedMeals)}, recentLikedMealsAvoidRepeat=${JSON.stringify(recentLikedMeals)}. Strongly avoid explicitly disliked meals. Treat dailyTargets as goals to get close to, not exact hard requirements. If dailyTargets.calories is provided, keep the rebuilt day close to it. If dailyTargets protein/carbs/fat are provided, use the replacement meals to help the whole day land reasonably near those macro targets. If the user has a cost-conscious preference, favor lower-cost ingredients and budget-friendly meals. If mealPrepMode is true, prefer batch-cook friendly meals that can repeat well. If mealPrepMode is false, avoid exact repeats from recentLikedMealsAvoidRepeat. Include a realistic AI-estimated costPerServing in USD for every meal. recipeYield is required: it is the number of standard servings the full ingredient list makes, and all nutrition is per serving. Output ONLY JSON { meals:[...] } matching schema with exactly one meal per requested type. Recipe fields must contain 3-6 numbered cooking steps separated by line breaks so the cook can follow each meal.`
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
            await tx.meal.createMany({ data: toAdd.map(m=>({ mealPlanId: existing.id, name:m.name, type:m.type, calories:Number(m.calories)||null, costPerServing:Number(m.costPerServing)||null, protein:Number(m.protein)||null, carbs:Number(m.carbs)||null, fat:Number(m.fat)||null, ingredients:Array.isArray(m.ingredients)?m.ingredients:[], recipe:m.recipe||'', recipeYield:Math.max(1, Math.round(Number(m.recipeYield)||1)), includeInGroceries })) });
          }
        });
      }
      results.push({ date, ok:true });
    }

    after(async () => {
      try {
        await refreshStoreSummariesForDates({
          userId: session.user.id,
          dates: items.map((item) => item?.date),
        });
      } catch (groceryError) {
        // Do not roll back a successful meal replacement if grocery generation fails.
        console.error('Automatic grocery summary refresh failed', groceryError);
      }
    });

    return NextResponse.json({ ok:true, results });
  } catch(err){
    console.error('replace meals error', err);
    const timedOut = err?.name === 'APIConnectionTimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'Meal replacement took too long. Please try again.' : 'Server error' },
      { status: timedOut ? 504 : 500 }
    );
  }
}
