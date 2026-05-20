import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata = {
  title: "burnNbyte",
  description: "",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions); // server session

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientLayout session={session}>{children}</ClientLayout>
      </body>
    </html>
  );
}
