import { NextResponse } from 'next/server';
import { requireAppApiSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

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

function toUTCDateFromLocalYMD(ymd){
  const [y,m,d] = String(ymd||'').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, (m||1)-1, d||1));
}
function parseYMDLocal(ymd){
  const [y,m,d] = String(ymd||'').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, (m||1)-1, d||1);
}
function startOfWeekLocal(d){
  if (!d) return null;
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const dow = x.getDay();
  x.setDate(x.getDate() - dow);
  return x;
}
function normalizeStoreItems(items = [], { resetChecked = false, summaryId } = {}){
  let changed = false;
  const normalized = (Array.isArray(items) ? items : []).map((item, idx) => {
    const id = item?.id || `${summaryId || 'item'}-${idx}`;
    if (!item?.id) changed = true;
    return {
      id,
      name: item?.name || `Item ${idx + 1}`,
      quantity: typeof item?.quantity === 'number' ? item.quantity : Number(item?.quantity) || 0,
      unit: item?.unit || '',
      packageSize: item?.packageSize || '',
      notes: item?.notes || '',
      checked: resetChecked ? false : Boolean(item?.checked),
    };
  });
  return { items: normalized, changed };
}

export async function GET() {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const start = startOfTodayUTC();
    const end = addDaysUTC(start, 6); // 7 days inclusive

    const plans = await prisma.mealPlan.findMany({
      where: {
        userId: session.user.id,
        date: { gte: start, lte: end },
      },
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
    return NextResponse.json({ start, end, days: 7, items });
  } catch (err) {
    console.error('groceries GET failed', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// AI-powered normalization and aggregation to store-ready purchases
export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const unitSystem = body.unitSystem === 'metric' ? 'metric' : 'imperial';
    const forceRefresh = Boolean(body.refresh);
    // Support week selection via local YYYY-MM-DD date
    let start;
    if (body.date) {
      const sel = parseYMDLocal(String(body.date));
      const sow = startOfWeekLocal(sel);
      start = toUTCDateFromLocalYMD(`${sow.getFullYear()}-${String(sow.getMonth()+1).padStart(2,'0')}-${String(sow.getDate()).padStart(2,'0')}`);
    } else {
      start = startOfTodayUTC();
    }
    const end = addDaysUTC(start, 6);

    const plans = await prisma.mealPlan.findMany({
      where: { userId: session.user.id, date: { gte: start, lte: end } },
      include: { meals: true },
      orderBy: { date: 'asc' },
    });

    const rawLines = [];
    for (const p of plans) {
      for (const m of p.meals || []) {
        const ings = Array.isArray(m.ingredients) ? m.ingredients : [];
        for (const line of ings) {
          const s = String(line || '').trim();
          if (s) rawLines.push(s);
        }
      }
    }

    if (!rawLines.length) {
      // Cache empty result as well to avoid repeated calls
      try {
        await prisma.grocerySummary.upsert({
          where: {
            userId_start_end_unitSystem: {
              userId: session.user.id,
              start,
              end,
              unitSystem,
            },
          },
          update: { items: [], note: 'No ingredients found' },
          create: { userId: session.user.id, start, end, unitSystem, items: [], note: 'No ingredients found' },
        });
      } catch (e) {
        console.warn('Failed to upsert empty grocery summary cache', e?.message || e);
      }
      return NextResponse.json({ start, end, unitSystem, items: [], note: 'No ingredients found', cached: false }, { status: 200 });
    }

    // If not forcing refresh, check for a cached grocery summary first
    if (!forceRefresh) {
      try {
        const cached = await prisma.grocerySummary.findUnique({
          where: {
            userId_start_end_unitSystem: {
              userId: session.user.id,
              start,
              end,
              unitSystem,
            },
          },
        });
        const hasUsableItems = Array.isArray(cached?.items) && cached.items.length > 0;
        if (cached && hasUsableItems) {
          const { items: normalizedItems, changed } = normalizeStoreItems(cached.items, { summaryId: cached.id });
          if (changed) {
            try {
              await prisma.grocerySummary.update({ where: { id: cached.id }, data: { items: normalizedItems } });
            } catch (e) {
              console.warn('Failed to normalize cached grocery items', e?.message || e);
            }
          }
          return NextResponse.json({
            start,
            end,
            unitSystem,
            items: normalizedItems,
            note: cached.note ?? 'cached',
            cached: true,
          });
        }
      } catch (e) {
        // fall through to regeneration on any DB error
        console.warn('Grocery summary cache lookup failed; regenerating', e?.message || e);
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });

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
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              // OpenAI strict JSON schema requires 'required' to include every key in properties
              required: ['name', 'quantity', 'unit', 'packageSize', 'notes'],
              properties: {
                name: { type: 'string' }, // e.g., eggs, rice, olive oil
                quantity: { anyOf: [{ type: 'number' }, { type: 'integer' }] },
                unit: { type: 'string' }, // e.g., dozen, lbs, bags, cans, bottles
                packageSize: { type: 'string' }, // e.g., '1 lb bag', '12 oz can'
                notes: { type: 'string' }, // brand or clarifications
              },
            },
          },
        },
      },
    };

    const prompt = {
      role: 'user',
      content: `You are a grocery planner. Given a list of ingredient lines from recipes for the next 7 days, combine like items, parse quantities, and output a consolidated shopping list using real-world store purchase units. Respect the requested unit system (${unitSystem}).\n\nInput lines (one per entry):\n${rawLines.map((l) => `- ${l}`).join('\n')}\n\nGuidelines:\n- Combine duplicate items (e.g., multiple entries of 'eggs' -> total egg count; use 'dozen' in ${unitSystem === 'imperial' ? 'imperial' : 'metric'} region where appropriate).\n- Convert kitchen measures to store-ready packages:\n  - Dry goods like rice/flour -> pounds or kilogram bags (choose typical size, e.g., 1 lb or 2 lb in imperial; 500 g or 1 kg in metric).\n  - Liquids like milk/broth/oil -> bottles/cartons with common sizes (e.g., 1 qt / 1 L).\n  - Spices/herbs -> small jars or bunches.\n- For eggs, prefer counts/dozen (e.g., 1 dozen = 12 eggs).\n- Round sensibly up to whole packages needed.\n- Keep names generic (e.g., 'brown rice' if specified, else 'rice').\n- Respond ONLY with JSON matching the schema (no prose).`,
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4',
      messages: [prompt],
      response_format: { type: 'json_schema', json_schema: SHOP_SCHEMA },
      temperature: 0.2,
    });

    let content = completion.choices?.[0]?.message?.content ?? '';
    if (content.trim().startsWith('```')) {
      content = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }
    let out;
    try {
      out = JSON.parse(content);
    } catch (e) {
      return NextResponse.json({ items: [], note: 'Failed to parse AI response' }, { status: 502 });
    }
    const { items: normalizedItems } = normalizeStoreItems(out.items || [], { resetChecked: true });

    // Persist or update the cached summary
    try {
      await prisma.grocerySummary.upsert({
        where: {
          userId_start_end_unitSystem: {
            userId: session.user.id,
            start,
            end,
            unitSystem,
          },
        },
        update: {
          items: normalizedItems,
          note: out.note ?? null,
        },
        create: {
          userId: session.user.id,
          start,
          end,
          unitSystem,
          items: normalizedItems,
          note: out.note ?? null,
        },
      });
    } catch (e) {
      console.warn('Failed to upsert grocery summary cache', e?.message || e);
    }

    return NextResponse.json({ start, end, unitSystem, items: normalizedItems, note: out.note, cached: false });
  } catch (err) {
    console.error('groceries POST failed', err);
    const timedOut = err?.name === 'APIConnectionTimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'Grocery optimization took too long. Please try again.' : 'Server error' },
      { status: timedOut ? 504 : 500 }
    );
  }
}
