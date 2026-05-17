import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isMealType } from "@/lib/mealPlanUtils";

function normalizeKind(value) {
  const kind = String(value || "").toUpperCase();
  return kind === "FOOD" || kind === "MEAL" ? kind : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.mealLibraryItem.findMany({
      where: { userId: session.user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("mealLibrary GET failed", err);
    return NextResponse.json({ error: "Failed to fetch library items." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const kind = normalizeKind(body?.kind);
    const name = String(body?.name || "").trim();
    const defaultMealType = String(body?.defaultMealType || "").toLowerCase();

    if (!kind) {
      return NextResponse.json({ error: "Choose FOOD or MEAL." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (defaultMealType && !isMealType(defaultMealType)) {
      return NextResponse.json({ error: "Choose a valid meal type." }, { status: 400 });
    }

    const item = await prisma.mealLibraryItem.create({
      data: {
        userId: session.user.id,
        kind,
        name,
        defaultMealType: defaultMealType || null,
        description: String(body?.description || "").trim() || null,
        calories: body?.calories == null || body?.calories === "" ? null : Math.round(Number(body.calories)),
        costPerServing: body?.costPerServing == null || body?.costPerServing === "" ? null : Number(body.costPerServing),
        protein: body?.protein == null || body?.protein === "" ? null : Number(body.protein),
        carbs: body?.carbs == null || body?.carbs === "" ? null : Number(body.carbs),
        fat: body?.fat == null || body?.fat === "" ? null : Number(body.fat),
        ingredients: Array.isArray(body?.ingredients) ? body.ingredients.map((item) => String(item || "").trim()).filter(Boolean) : [],
        recipe: String(body?.recipe || "").trim() || null,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("mealLibrary POST failed", err);
    return NextResponse.json({ error: "Failed to save library item." }, { status: 500 });
  }
}
