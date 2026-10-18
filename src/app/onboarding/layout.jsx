import { requireAuth } from "@/lib/auth";

export default async function OnboardingLayout({ children }) {
  await requireAuth();
  return children;
}
