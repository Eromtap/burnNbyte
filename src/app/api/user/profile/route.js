import { requireAppApiSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req) {
  const auth = await requireAppApiSession();
  if (auth.response) return auth.response;
  const { session } = auth;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
  });

  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: {userId: user.id}
  })



  return new Response(JSON.stringify({
    preferencesFilledOut: Boolean(profile),
  }));
}
