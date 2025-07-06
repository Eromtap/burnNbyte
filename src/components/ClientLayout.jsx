'use client';
import { SessionProvider } from "next-auth/react";
import { OnboardingProvider } from "@/lib/formState";

export default function ClientLayout({ children }) {
  return (
    <SessionProvider>
      <OnboardingProvider>
        {children}
      </OnboardingProvider>
    </SessionProvider>
  );
}