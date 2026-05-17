import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import MealLibraryPageClient from "@/components/MealLibraryPageClient";

export default async function MealLibraryPage() {
  const session = await requireAuth();

  const items = await prisma.mealLibraryItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main>
      <div className="page-shell stack">
        <MealLibraryPageClient initialItems={items} />
      </div>
    </main>
  );
}
