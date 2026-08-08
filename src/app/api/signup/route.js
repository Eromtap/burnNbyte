import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const termsAccepted = Boolean(body?.termsAccepted);

    if (!name || !email || !password) {
      return Response.json({ error: "Enter your name, email, and password." }, { status: 400 });
    }
    if (name.length > 80 || !EMAIL_PATTERN.test(email)) {
      return Response.json({ error: "Enter a valid name and email address." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return Response.json({ error: "Password must be between 8 and 72 characters." }, { status: 400 });
    }
    if (!termsAccepted) {
      return Response.json({ error: "You must accept the terms and conditions" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ error: "An account already exists for that email." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        termsAcceptedAt: new Date(),
      },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
