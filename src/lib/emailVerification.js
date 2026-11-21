import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import {
  createAppUrl,
  isTransactionalEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/transactionalEmail";

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

export function isEmailConfigured() {
  return isTransactionalEmailConfigured();
}

export async function createVerificationToken(userId) {
  const token = randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    },
  });
  return token;
}

export async function sendVerificationEmail(email, token) {
  const verificationUrl = createAppUrl("/verify-email");
  verificationUrl.searchParams.set("token", token);

  return sendTransactionalEmail({
    to: email,
    subject: "Verify your BurnnByte email",
    html: `<p>Confirm your email address to finish creating your BurnnByte account.</p><p><a href="${verificationUrl.toString()}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>`,
    text: `Confirm your email address to finish creating your BurnnByte account: ${verificationUrl.toString()}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    idempotencyKey: `email-verification/${hashToken(token)}`,
  });
}

export async function resendVerification(userId, email) {
  const lastToken = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastToken && Date.now() - lastToken.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return;
  }

  const token = await createVerificationToken(userId);
  await sendVerificationEmail(email, token);
}

export async function verifyEmailToken(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return false;
  }

  const tokenHash = hashToken(token);
  return prisma.$transaction(async (transaction) => {
    const storedToken = await transaction.emailVerificationToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      select: { userId: true },
    });
    if (!storedToken) return false;

    const deleted = await transaction.emailVerificationToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (deleted.count !== 1) return false;

    const verification = await transaction.user.updateMany({
      where: { id: storedToken.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return verification.count === 1;
  });
}
