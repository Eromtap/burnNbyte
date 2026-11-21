import { verifyEmailToken } from "@/lib/emailVerification";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const verified = await verifyEmailToken(body?.token);
    if (!verified) {
      return Response.json({ error: "This verification link is invalid or has expired. Request a new one to continue." }, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Email verification failed", error);
    return Response.json({ error: "Email verification is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
