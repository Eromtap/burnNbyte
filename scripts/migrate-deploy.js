const { spawnSync } = require("node:child_process");

const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
const result = spawnSync(command, ["migrate", "deploy"], {
  env: {
    ...process.env,
    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
