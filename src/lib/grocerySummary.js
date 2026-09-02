import OpenAI from 'openai';
import prisma from '@/lib/prisma';

function toUTCDateFromYMD(ymd) {
  const [year, month, day] = String(ymd || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfWeek(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeStoreItems(items = [], { resetChecked = false, summaryId } = {}) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    id: item?.id || `${summaryId || 'item'}-${index}`,
    name: item?.name || `Item ${index + 1}`,
    quantity: typeof item?.quantity === 'number' ? item.quantity : Number(item?.quantity) || 0,
    unit: item?.unit || '',
    packageSize: item?.packageSize || '',
    notes: item?.notes || '',
    checked: resetChecked ? false : Boolean(item?.checked),
  }));
}

const SHOP_SCHEMA = {
  name: 'shopping_list',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'quantity', 'unit', 'packageSize', 'notes'],
          properties: {
            name: { type: 'string' },
            quantity: { anyOf: [{ type: 'number' }, { type: 'integer' }] },
            unit: { type: 'string' },
            packageSize: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
  },
};

export async function refreshStoreSummary({ userId, weekStart, unitSystem = 'imperial' }) {
  const start = startOfWeek(weekStart);
  const end = addDays(start, 6);
  const plans = await prisma.mealPlan.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { meals: true },
    orderBy: { date: 'asc' },
  });
  const rawLines = plans.flatMap((plan) => (
    (plan.meals || []).flatMap((meal) => (
      (Array.isArray(meal.ingredients) ? meal.ingredients : [])
        .map((ingredient) => String(ingredient || '').trim())
        .filter(Boolean)
    ))
  ));

  if (!rawLines.length) {
    return prisma.grocerySummary.upsert({
      where: { userId_start_end_unitSystem: { userId, start, end, unitSystem } },
      update: { items: [], note: 'No ingredients found' },
      create: { userId, start, end, unitSystem, items: [], note: 'No ingredients found' },
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });
  if (!openai.apiKey) throw new Error('Missing OPENAI_API_KEY server env var');

  const completion = await openai.chat.completions.create({
    model: 'gpt-5.4',
    messages: [{
      role: 'user',
      content: `You are a grocery planner. Given recipe ingredient lines for a week, combine like items and output a consolidated shopping list using real-world store purchase units. Respect the requested unit system (${unitSystem}).\n\nInput lines:\n${rawLines.map((line) => `- ${line}`).join('\n')}\n\nGuidelines:\n- Convert recipe quantities to whole store purchases.\n- Combine matching items across all meals.\n- Use sensible packages: bags, cans, bottles, cartons, dozen, pounds/kilograms.\n- Round up to whole packages.\n- Keep names generic unless a specific product is required.\nRespond only with JSON matching the schema.`,
    }],
    response_format: { type: 'json_schema', json_schema: SHOP_SCHEMA },
    temperature: 0.2,
  });

  let content = completion.choices?.[0]?.message?.content ?? '';
  if (content.trim().startsWith('```')) {
    content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(content);
  const items = normalizeStoreItems(parsed.items, { resetChecked: true });

  return prisma.grocerySummary.upsert({
    where: { userId_start_end_unitSystem: { userId, start, end, unitSystem } },
    update: { items, note: null },
    create: { userId, start, end, unitSystem, items, note: null },
  });
}

export async function refreshStoreSummariesForDates({ userId, dates, unitSystem = 'imperial' }) {
  const weeks = new Map();
  for (const value of dates || []) {
    const date = toUTCDateFromYMD(value);
    if (!date) continue;
    const start = startOfWeek(date);
    weeks.set(start.toISOString(), start);
  }
  return Promise.all(
    [...weeks.values()].map((weekStart) => refreshStoreSummary({ userId, weekStart, unitSystem }))
  );
}
