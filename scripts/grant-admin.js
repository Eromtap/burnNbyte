const { PrismaClient } = require("@prisma/client");

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run admin:grant -- user@example.com");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
      select: { id: true, email: true, isAdmin: true },
    });

    console.log(`Admin granted: ${user.email} (${user.id})`);
  } catch (error) {
    if (error?.code === "P2025") {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.error("Failed to grant admin", error);
    process.exit(1);
  }
}

main();
