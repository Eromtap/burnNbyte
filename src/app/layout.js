import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata = {
  applicationName: "burnNbyte",
  title: {
    default: "burnNbyte — Training and nutrition, aligned",
    template: "%s — burnNbyte",
  },
  description: "Personalized workouts, meal planning, grocery preparation, and progress tracking in one focused daily system.",
  icons: { icon: "/favicon.ico" },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080808",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions); // server session

  return (
    <html lang="en" data-theme="tech-red" suppressHydrationWarning>
      <body>
        <ClientLayout session={session}>{children}</ClientLayout>
      </body>
    </html>
  );
}
