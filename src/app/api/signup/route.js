import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import {
  createVerificationToken,
  isEmailConfigured,
  isValidEmail,
  normalizeEmail,
  sendVerificationEmail,
} from "@/lib/emailVerification";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const termsAccepted = Boolean(body?.termsAccepted);

    if (!name || !email || !password) {
      return Response.json({ error: "Enter your name, email, and password." }, { status: 400 });
    }
    if (name.length > 80 || !isValidEmail(email)) {
      return Response.json({ error: "Enter a valid name and email address." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return Response.json({ error: "Password must be between 8 and 72 characters." }, { status: 400 });
    }
    if (!termsAccepted) {
      return Response.json({ error: "You must accept the terms and conditions" }, { status: 400 });
    }
    if (!isEmailConfigured()) {
      return Response.json(
        { error: "Email verification is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ error: "An account already exists for that email." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        termsAcceptedAt: new Date(),
      },
      select: { id: true },
    });

    try {
      const token = await createVerificationToken(user.id);
      await sendVerificationEmail(email, token);
    } catch (error) {
      console.error("Signup verification email failed", error);
      return Response.json(
        {
          error: "Your account was created, but the verification email could not be sent. Request another email to try again.",
          accountCreated: true,
        },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
