import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  MAX_SUGGESTIONS_PER_DAY,
  getDayKeyInTimeZone,
  parseSuggestionPayload,
  resolveTimeZone,
} from "@/lib/suggestions";

export const runtime = "nodejs";

function getResolvedTimeZone(req, payload) {
  return resolveTimeZone(
    req.headers.get("x-vercel-ip-timezone") ||
      payload?.timeZone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC"
  );
}

async function getSuggestionQuota(userId, dayKey) {
  const used = await prisma.appSuggestion.count({
    where: { userId, dayKey },
  });

  return {
    used,
    remaining: Math.max(0, MAX_SUGGESTIONS_PER_DAY - used),
  };
}

async function createSuggestionWithDailyCap({ userId, kind, message, dayKey, timeZone }) {
  for (let attempt = 0; attempt < MAX_SUGGESTIONS_PER_DAY; attempt += 1) {
    const result = await prisma.$transaction(async (tx) => {
      const used = await tx.appSuggestion.count({
        where: { userId, dayKey },
      });

      if (used >= MAX_SUGGESTIONS_PER_DAY) {
        return { limited: true, used };
      }

      try {
        const suggestion = await tx.appSuggestion.create({
          data: {
            userId,
            kind,
            message,
            dayKey,
            dailySlot: used + 1,
            timeZone,
          },
        });

        return { limited: false, used: used + 1, suggestion };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return { conflict: true };
        }

        throw error;
      }
    });

    if (!result?.conflict) return result;
  }

  return { limited: true, used: MAX_SUGGESTIONS_PER_DAY };
}

export async function GET(req) {
  try {
    if (typeof prisma.appSuggestion?.count !== "function") {
      return NextResponse.json(
        { error: "Suggestion client not initialized yet. Restart the dev server once." },
        { status: 503 }
      );
    }

    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const userId = String(auth.session.user.id);

    const timeZone = getResolvedTimeZone(req);
    const dayKey = getDayKeyInTimeZone(new Date(), timeZone);
    const quota = await getSuggestionQuota(userId, dayKey);

    return NextResponse.json({
      ok: true,
      dayKey,
      timeZone,
      limit: MAX_SUGGESTIONS_PER_DAY,
      ...quota,
    });
  } catch (error) {
    console.error("suggestion quota lookup failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (typeof prisma.appSuggestion?.create !== "function") {
      return NextResponse.json(
        { error: "Suggestion client not initialized yet. Restart the dev server once." },
        { status: 503 }
      );
    }

    const auth = await requireAppApiSession();
    if (auth.response) return auth.response;
    const userId = String(auth.session.user.id);

    const body = (await req.json().catch(() => ({}))) || {};
    const parsed = parseSuggestionPayload(body);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const timeZone = getResolvedTimeZone(req, body);
    const dayKey = getDayKeyInTimeZone(new Date(), timeZone);
    const result = await createSuggestionWithDailyCap({
      userId,
      kind: parsed.kind,
      message: parsed.message,
      dayKey,
      timeZone,
    });

    if (result.limited) {
      return NextResponse.json(
        {
          error: `You have reached the ${MAX_SUGGESTIONS_PER_DAY} suggestion limit for ${dayKey}.`,
          dayKey,
          timeZone,
          limit: MAX_SUGGESTIONS_PER_DAY,
          used: result.used,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      ok: true,
      suggestion: result.suggestion,
      dayKey,
      timeZone,
      limit: MAX_SUGGESTIONS_PER_DAY,
      used: result.used,
      remaining: Math.max(0, MAX_SUGGESTIONS_PER_DAY - result.used),
    });
  } catch (error) {
    console.error("suggestion create failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
