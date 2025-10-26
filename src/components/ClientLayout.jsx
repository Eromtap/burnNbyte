'use client';
import { SessionProvider } from "next-auth/react";
import { OnboardingProvider } from "@/lib/formState";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppFrame from "./AppFrame";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children, session }) {
  const pathname = usePathname();
  const bareRoutes = ["/signin", "/signup", "/onboarding"]; // render without app frame
  const isBare = bareRoutes.some((p) => pathname?.startsWith(p));
  return (
    <SessionProvider session={session}>
      <OnboardingProvider>
        <ThemeProvider>
          {isBare ? children : <AppFrame>{children}</AppFrame>}
        </ThemeProvider>
      </OnboardingProvider>
    </SessionProvider>
  );
}
