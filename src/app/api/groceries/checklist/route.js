import { NextResponse } from "next/server";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
function normalizeItems(items = [], summaryId) {
  let changed = false;
  const normalized = (Array.isArray(items) ? items : []).map((item, idx) => {
    const id = item?.id || `${summaryId || "item"}-${idx}`;
    if (!item?.id) changed = true;
    return {
      id,
      name: item?.name || `Item ${idx + 1}`,
      quantity: item?.quantity ?? 0,
      unit: item?.unit || "",
      packageSize: item?.packageSize || "",
      notes: item?.notes || "",
      checked: Boolean(item?.checked),
    };
  });
  return { items: normalized, changed };
}

async function loadSummary(summaryId, userId) {
  return prisma.grocerySummary.findFirst({
    where: { id: summaryId, userId },
  });
}

function normalizeBoth(items = [], summaryId) {
  const { items: normalized, changed } = normalizeItems(items, summaryId);
  return { normalized, changed };
}

export async function PATCH(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const summaryId = typeof body?.summaryId === "string" ? body.summaryId : "";
    const itemId = typeof body?.itemId === "string" ? body.itemId : "";
    const checked = Boolean(body?.checked);
    if (!summaryId || !itemId) {
      return NextResponse.json({ error: "Missing summaryId or itemId" }, { status: 400 });
    }

    const summary = await loadSummary(summaryId, session.user.id);
    if (!summary) {
      return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
    }

    const { normalized: items, changed } = normalizeBoth(summary.items, summary.id);
    if (changed) {
      try {
        await prisma.grocerySummary.update({ where: { id: summary.id }, data: { items } });
      } catch (e) {
        console.warn("Failed to persist normalized grocery items", e?.message || e);
      }
    }

    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    items[idx].checked = checked;

    const updated = await prisma.grocerySummary.update({
      where: { id: summary.id },
      data: { items },
    });

    return NextResponse.json({ ok: true, items: updated.items });
  } catch (err) {
    console.error("grocery checklist toggle failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) || {};
    const summaryId = typeof body?.summaryId === "string" ? body.summaryId : "";
    const action = body?.action;
    if (!summaryId || (action !== "completeList" && action !== "restore")) {
      return NextResponse.json({ error: "Missing summaryId or unsupported action" }, { status: 400 });
    }

    const summary = await loadSummary(summaryId, session.user.id);
    if (!summary) {
      return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
    }

    if (action === "completeList") {
      const { normalized: items, changed } = normalizeBoth(summary.items, summary.id);
      if (changed) {
        try {
          await prisma.grocerySummary.update({ where: { id: summary.id }, data: { items } });
        } catch (e) {
          console.warn("Failed to persist normalized grocery items (complete)", e?.message || e);
        }
      }
      const archivedItems = items; // preserve per-item checked state; do not auto-check
      const updated = await prisma.grocerySummary.update({
        where: { id: summary.id },
        data: { items: [], archivedItems, archivedAt: new Date(), clearedAt: new Date(), note: summary.note || "Completed and cleared" },
      });
      return NextResponse.json({ ok: true, items: updated.items, archivedItems, clearedAt: updated.clearedAt, archivedAt: updated.archivedAt });
    }

    if (action === "restore") {
      const { normalized: archivedItems } = normalizeBoth(summary.archivedItems || [], summary.id);
      if (!archivedItems.length) {
        return NextResponse.json({ error: "No archived list to restore" }, { status: 404 });
      }
      const updated = await prisma.grocerySummary.update({
        where: { id: summary.id },
        data: { items: archivedItems, archivedItems: [], clearedAt: null, archivedAt: null },
      });
      return NextResponse.json({ ok: true, items: updated.items, archivedItems: updated.archivedItems, clearedAt: updated.clearedAt });
    }
  } catch (err) {
    console.error("grocery checklist complete failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
