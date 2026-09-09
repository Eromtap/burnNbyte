import {
  getValidRetailerAccessToken,
  saveRetailerConnection,
} from "@/lib/retailer";

export const KROGER_PROVIDER = "KROGER";
export const KROGER_CAPABILITIES = Object.freeze({
  catalogSearch: true,
  cartHandoff: true,
  inAppCheckout: false,
  fulfillmentSelection: false,
});

const KROGER_API_ORIGIN = "https://api.kroger.com";
const AUTHORIZE_URL = `${KROGER_API_ORIGIN}/v1/connect/oauth2/authorize`;
const TOKEN_URL = `${KROGER_API_ORIGIN}/v1/connect/oauth2/token`;
const DEFAULT_SCOPES = ["product.compact", "cart.basic:write", "profile.compact"];
const DEFAULT_SCOPE = DEFAULT_SCOPES.join(" ");

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function krogerConfiguration() {
  return {
    clientId: requiredEnvironment("KROGER_CLIENT_ID"),
    clientSecret: requiredEnvironment("KROGER_CLIENT_SECRET"),
    redirectUri: requiredEnvironment("KROGER_REDIRECT_URI"),
  };
}

export function buildKrogerAuthorizeUrl({ state }) {
  const { clientId, redirectUri } = krogerConfiguration();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DEFAULT_SCOPE);
  url.searchParams.set("state", state);
  return url;
}

async function requestToken(parameters) {
  const { clientId, clientSecret } = krogerConfiguration();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(parameters),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.access_token) {
    const error = new Error("Kroger did not issue an access token.");
    error.status = response.status;
    throw error;
  }
  return body;
}

export function exchangeKrogerAuthorizationCode(code) {
  const { redirectUri } = krogerConfiguration();
  return requestToken({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: redirectUri,
  });
}

export function refreshKrogerAuthorization(refreshToken) {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: String(refreshToken),
  });
}

export function saveKrogerConnection(userId, tokenResponse) {
  return saveRetailerConnection({
    userId,
    provider: KROGER_PROVIDER,
    tokenResponse,
    defaultScope: DEFAULT_SCOPE,
  });
}

export function getValidKrogerAccessToken(userId) {
  return getValidRetailerAccessToken({
    userId,
    provider: KROGER_PROVIDER,
    refreshAuthorization: refreshKrogerAuthorization,
    defaultScope: DEFAULT_SCOPE,
  });
}
