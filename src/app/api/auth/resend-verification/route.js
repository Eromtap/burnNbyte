import prisma from "@/lib/prisma";
import {
  isEmailConfigured,
  isValidEmail,
  normalizeEmail,
  resendVerification,
} from "@/lib/emailVerification";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!isEmailConfigured()) {
      return Response.json({ error: "Email verification is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (user && !user.emailVerifiedAt) {
      await resendVerification(user.id, user.email);
    }

    return Response.json({
      success: true,
      message: "If an account with that address needs verification, a new link will be sent.",
    });
  } catch (error) {
    console.error("Verification email resend failed", error);
    return Response.json({ error: "We could not send a verification email. Please try again later." }, { status: 502 });
  }
}
