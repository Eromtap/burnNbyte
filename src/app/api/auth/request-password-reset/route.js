import { isValidEmail, normalizeEmail } from "@/lib/emailVerification";
import {
  isPasswordResetConfigured,
  requestPasswordReset,
} from "@/lib/passwordReset";

const GENERIC_MESSAGE =
  "If an eligible account exists for that address, a password-reset link will be sent.";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isPasswordResetConfigured()) {
    return Response.json(
      { error: "Password reset is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    // Keep the public response identical so this endpoint cannot be used to
    // discover which email addresses have BurnnByte accounts.
    console.error("Password-reset request failed", error);
  }

  return Response.json({ success: true, message: GENERIC_MESSAGE });
}
