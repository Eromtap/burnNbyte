import Stripe from "stripe";

let stripe;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export function getAppUrl() {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}
