import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import {
  isMealType,
  normalizeStringList,
  toNullableFloat,
  toNullableInt,
} from "@/lib/mealPlanUtils";

function normalizeKind(value) {
  const kind = String(value || "").toUpperCase();
  return kind === "FOOD" || kind === "MEAL" ? kind : null;
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemId = String(params?.itemId || "");
    if (!itemId) {
      return NextResponse.json({ error: "Missing library item id." }, { status: 400 });
    }

    const existing = await prisma.mealLibraryItem.findFirst({
      where: { id: itemId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Library item not found." }, { status: 404 });
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

    const item = await prisma.mealLibraryItem.update({
      where: { id: itemId },
      data: {
        kind,
        name,
        defaultMealType: defaultMealType || null,
        description: String(body?.description || "").trim() || null,
        calories: toNullableInt(body?.calories),
        costPerServing: toNullableFloat(body?.costPerServing),
        protein: toNullableFloat(body?.protein),
        carbs: toNullableFloat(body?.carbs),
        fat: toNullableFloat(body?.fat),
        ingredients: normalizeStringList(body?.ingredients).slice(0, 24),
        recipe: String(body?.recipe || "").trim() || null,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("mealLibrary/[itemId] PATCH failed", err);
    return NextResponse.json({ error: "Failed to update library item." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemId = String(params?.itemId || "");
    if (!itemId) {
      return NextResponse.json({ error: "Missing library item id." }, { status: 400 });
    }

    const existing = await prisma.mealLibraryItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Library item not found." }, { status: 404 });
    }

    await prisma.mealLibraryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mealLibrary/[itemId] DELETE failed", err);
    return NextResponse.json({ error: "Failed to delete library item." }, { status: 500 });
  }
}
