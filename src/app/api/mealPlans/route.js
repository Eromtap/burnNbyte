// // ===============================================
// // FILE: src/app/api/mealplans/route.js
// // ===============================================
// import { getServerSession as _getServerSession } from "next-auth";
// import { authOptions as _authOptions } from "@/app/api/auth/[...nextauth]/route";
// import _prisma from "@/lib/prisma";

// export async function GET() {
//   const session = await _getServerSession(_authOptions);
//   const userId = session?.user?.id;
//   if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

//   const mealPlans = await _prisma.mealPlan.findMany({
//     where: { userId },
//     orderBy: { date: "asc" },
//     include: { meals: true },
//   });

//   return Response.json(mealPlans);
// }
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function toUTCDateFromLocalYMD(ymd) {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (date) {
      const baseUtc = toUTCDateFromLocalYMD(date);
      const mealPlan = await prisma.mealPlan.findFirst({
        where: { userId: session.user.id, date: baseUtc },
        include: { meals: true },
      });
      return NextResponse.json({ mealPlan });
    }

    // Include related meals
    const mealPlans = await prisma.mealPlan.findMany({
      where: { userId: session.user.id },
      include: { meals: true }, // <-- include meals
      orderBy: { date: "asc" },
    });

    return NextResponse.json(mealPlans);
  } catch (err) {
    console.error("Failed to fetch meal plans", err);
    return NextResponse.json({ error: "Failed to fetch meal plans" }, { status: 500 });
  }
}
