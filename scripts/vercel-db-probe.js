const net = require('node:net');

const rawUrl = process.env.DATABASE_URL_UNPOOLED;
if (!rawUrl) {
  console.error('[db-probe] DATABASE_URL_UNPOOLED is not set.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  console.error('[db-probe] DATABASE_URL_UNPOOLED is not a valid URL.');
  process.exit(1);
}

const port = Number(parsed.port || 5432);
console.log(`[db-probe] Testing direct database TCP connection to ${parsed.hostname}:${port}.`);

const socket = net.createConnection({ host: parsed.hostname, port });
const timeout = setTimeout(() => {
  socket.destroy();
  console.error('[db-probe] Timed out connecting to the direct database endpoint.');
  process.exit(1);
}, 10000);

socket.once('connect', () => {
  clearTimeout(timeout);
  socket.end();
  console.log('[db-probe] Direct database endpoint is reachable.');
});

socket.once('error', (error) => {
  clearTimeout(timeout);
  console.error(`[db-probe] Direct database connection failed: ${error.code || error.message}`);
  process.exit(1);
});
