export const MAX_SUGGESTIONS_PER_DAY = 5;
export const MAX_SUGGESTION_LENGTH = 500;
export const MIN_SUGGESTION_LENGTH = 3;

export const SUGGESTION_KIND_OPTIONS = [
  { value: "ADDITION", label: "Suggest an addition" },
  { value: "CHANGE", label: "Suggest a change" },
  { value: "GENERAL_FEEDBACK", label: "General feedback" },
];

const ALLOWED_SUGGESTION_KINDS = new Set(
  SUGGESTION_KIND_OPTIONS.map((option) => option.value)
);

export function resolveTimeZone(candidate) {
  try {
    if (candidate) {
      new Intl.DateTimeFormat(undefined, { timeZone: candidate }).format(new Date());
      return candidate;
    }
  } catch (_err) {
    // Fall through to UTC when the provided time zone is invalid.
  }

  return "UTC";
}

export function getDayKeyInTimeZone(date = new Date(), timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function normalizeSuggestionText(value) {
  if (typeof value !== "string") return "";

  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
}

export function parseSuggestionPayload(payload) {
  const kind =
    typeof payload?.kind === "string" ? payload.kind.trim().toUpperCase() : "";
  const message = normalizeSuggestionText(payload?.message);

  if (!ALLOWED_SUGGESTION_KINDS.has(kind)) {
    return { error: "Choose whether this is an addition or a change." };
  }

  if (message.length < MIN_SUGGESTION_LENGTH) {
    return {
      error: `Suggestion text must be at least ${MIN_SUGGESTION_LENGTH} characters.`,
    };
  }

  if (message.length > MAX_SUGGESTION_LENGTH) {
    return {
      error: `Suggestion text must be ${MAX_SUGGESTION_LENGTH} characters or fewer.`,
    };
  }

  if (/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(message)) {
    return { error: "Suggestion text contains unsupported control characters." };
  }

  return { kind, message };
}
