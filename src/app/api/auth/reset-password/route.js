import { resetPassword } from "@/lib/passwordReset";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < 8 || password.length > 72) {
      return Response.json(
        { error: "Password must be between 8 and 72 characters." },
        { status: 400 }
      );
    }

    const updated = await resetPassword(body?.token, password);
    if (!updated) {
      return Response.json(
        { error: "This password-reset link is invalid or has expired. Request a new one to continue." },
        { status: 400 }
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Password reset failed", error);
    return Response.json(
      { error: "Password reset is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
