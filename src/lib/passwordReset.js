import bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/emailVerification";
import {
  createAppUrl,
  isTransactionalEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/transactionalEmail";

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPasswordResetConfigured() {
  return isTransactionalEmailConfigured();
}

async function createPasswordResetToken(userId) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    },
  });
  return token;
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = createAppUrl("/reset-password");
  resetUrl.searchParams.set("token", token);

  return sendTransactionalEmail({
    to: email,
    subject: "Reset your BurnnByte password",
    html: `<p>We received a request to reset your BurnnByte password.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>`,
    text: `Reset your BurnnByte password: ${resetUrl.toString()}\n\nThis link expires in one hour. If you did not request a reset, you can ignore this email.`,
    idempotencyKey: `password-reset/${hashToken(token)}`,
  });
}

export async function requestPasswordReset(rawEmail) {
  const email = normalizeEmail(rawEmail);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) return;

  const lastToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastToken && Date.now() - lastToken.createdAt.getTime() < REQUEST_COOLDOWN_MS) {
    return;
  }

  const token = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token, password) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) return false;
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return false;

  const passwordHash = await bcrypt.hash(password, 10);
  const tokenHash = hashToken(token);

  return prisma.$transaction(async (transaction) => {
    const storedToken = await transaction.passwordResetToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      select: { userId: true },
    });
    if (!storedToken) return false;

    const deleted = await transaction.passwordResetToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (deleted.count !== 1) return false;

    const updated = await transaction.user.updateMany({
      where: { id: storedToken.userId },
      data: {
        password: passwordHash,
        authVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) return false;

    await transaction.passwordResetToken.deleteMany({
      where: { userId: storedToken.userId },
    });
    return true;
  });
}
