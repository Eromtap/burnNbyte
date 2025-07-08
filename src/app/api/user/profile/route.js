import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; 
import prisma from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  return new Response(JSON.stringify({
    preferencesFilledOut: Boolean(user?.preferences),
  }));
}
