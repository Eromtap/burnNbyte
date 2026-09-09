import KrogerOAuthCompletion from "@/components/KrogerOAuthCompletion";

export const metadata = { title: "Kroger connection" };

export default async function KrogerCompletePage({ searchParams }) {
  const params = await searchParams;
  return (
    <KrogerOAuthCompletion
      status={String(params?.status || "error")}
      reason={String(params?.reason || "")}
      returnTo={String(params?.returnTo || "/groceries")}
    />
  );
}
