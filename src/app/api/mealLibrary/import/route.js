import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAppApiSession } from '@/lib/auth';

const RECIPE_SCHEMA = {
  name: 'imported_recipe',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'defaultMealType', 'description', 'calories', 'costPerServing', 'protein', 'carbs', 'fat', 'ingredients', 'recipe', 'recipeYield'],
    properties: {
      name: { type: 'string' },
      defaultMealType: { enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      description: { type: 'string' },
      calories: { type: 'integer' },
      costPerServing: { type: 'number' },
      protein: { type: 'number' },
      carbs: { type: 'number' },
      fat: { type: 'number' },
      ingredients: { type: 'array', minItems: 1, items: { type: 'string' } },
      recipe: { type: 'string' },
      recipeYield: { type: 'integer', minimum: 1, maximum: 24 },
    },
  },
};

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
}

function cleanPageText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30000);
}

function recipeJsonLd(html) {
  const matches = String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const recipes = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.some((type) => String(type).toLowerCase() === 'recipe')) recipes.push(value);
    Object.values(value).forEach(visit);
  };
  for (const match of matches) {
    try { visit(JSON.parse(match[1])); } catch { /* Ignore malformed page metadata. */ }
  }
  return recipes.slice(0, 2);
}

async function fetchRecipePage(inputUrl) {
  let current = new URL(inputUrl);
  for (let redirects = 0; redirects < 5; redirects += 1) {
    if (!['http:', 'https:'].includes(current.protocol) || isPrivateHost(current.hostname)) {
      throw new Error('That recipe link is not a public web page.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'BurnnByte recipe importer',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The recipe page redirected without a destination.');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`Could not open that recipe page (${response.status}).`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) throw new Error('That link does not point to a recipe web page.');
    return { url: current.toString(), html: (await response.text()).slice(0, 500000) };
  }
  throw new Error('That recipe link redirected too many times.');
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;

    const body = await req.json();
    const sourceUrl = String(body?.url || '').trim();
    if (!sourceUrl || sourceUrl.length > 2048) {
      return NextResponse.json({ error: 'Paste a valid recipe link.' }, { status: 400 });
    }

    let parsedUrl;
    try { parsedUrl = new URL(sourceUrl); } catch {
      return NextResponse.json({ error: 'Paste a valid recipe link.' }, { status: 400 });
    }

    const { url, html } = await fetchRecipePage(parsedUrl.toString());
    const structuredRecipe = recipeJsonLd(html);
    const pageText = cleanPageText(html);
    if (!structuredRecipe.length && pageText.length < 120) {
      return NextResponse.json({ error: 'We could not find enough recipe information on that page.' }, { status: 422 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 90000, maxRetries: 0 });
    if (!openai.apiKey) throw new Error('Recipe import is not configured.');
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4',
      temperature: 0.1,
      response_format: { type: 'json_schema', json_schema: RECIPE_SCHEMA },
      messages: [{
        role: 'user',
        content: `Extract one cookable recipe from this public recipe page. Preserve the recipe's ingredients and instructions. recipeYield is REQUIRED: use the source's yield/servings, or carefully infer it from the full ingredient quantities. Nutrition and cost must be for one serving, never the entire batch. Do not invent a recipe unrelated to the source. Provide recipe steps as numbered lines.\n\nSource URL: ${url}\n\nStructured recipe data:\n${JSON.stringify(structuredRecipe).slice(0, 25000)}\n\nVisible page text:\n${pageText}`,
      }],
    });
    const content = completion.choices?.[0]?.message?.content || '';
    const recipe = JSON.parse(content);
    return NextResponse.json({ recipe, sourceUrl: url });
  } catch (error) {
    console.error('mealLibrary import failed', error);
    const message = error?.name === 'AbortError'
      ? 'That recipe site took too long to respond. Try another link or paste the recipe manually.'
      : (error?.message || 'Could not import that recipe. Try another link or paste the recipe manually.');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
