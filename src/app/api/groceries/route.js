import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) || {};
    const unitSystem = body.unitSystem === 'metric' ? 'metric' : 'imperial';
    const start = startOfTodayUTC();
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
      return NextResponse.json({ items: [], note: 'No ingredients found' }, { status: 200 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      model: 'gpt-4o',
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

    return NextResponse.json({ start, end, unitSystem, ...out });
  } catch (err) {
    console.error('groceries POST failed', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
