import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence monorepo/lockfile root inference by pointing to the project root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
