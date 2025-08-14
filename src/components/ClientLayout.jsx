'use client';
import { SessionProvider } from "next-auth/react";
import { OnboardingProvider } from "@/lib/formState";

export default function ClientLayout({ children, session }) {
  return (
    <SessionProvider session={session}>
      <OnboardingProvider>
        {children}
      </OnboardingProvider>
    </SessionProvider>
  );
}
