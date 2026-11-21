export function getAppUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "";
}

export function isTransactionalEmailConfigured() {
  return Boolean(
    process.env.RESEND_EMAIL_API_KEY &&
    process.env.EMAIL_FROM &&
    getAppUrl()
  );
}

export function createAppUrl(pathname) {
  const configuredUrl = getAppUrl();
  if (!configuredUrl) {
    throw new Error("APP_URL or NEXTAUTH_URL must be configured.");
  }

  const baseUrl = new URL(configuredUrl);
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("APP_URL must use HTTP or HTTPS.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    (baseUrl.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(baseUrl.hostname))
  ) {
    throw new Error("APP_URL must be a public HTTPS URL in production.");
  }
  return new URL(pathname, baseUrl);
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}) {
  const apiKey = process.env.RESEND_EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !getAppUrl()) {
    throw new Error(
      "Transactional email is not configured. Set RESEND_EMAIL_API_KEY, EMAIL_FROM, and APP_URL."
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const body = {
    from,
    to: [to],
    subject,
    html,
    text,
  };
  if (process.env.EMAIL_REPLY_TO) {
    body.reply_to = process.env.EMAIL_REPLY_TO;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Transactional email delivery failed", response.status, details);
    throw new Error(`Email provider rejected the message (${response.status}).`);
  }

  return response.json().catch(() => ({}));
}
