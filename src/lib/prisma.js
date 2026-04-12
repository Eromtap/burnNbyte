// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient();
}

const cachedPrisma = globalForPrisma.prisma;
const prisma = cachedPrisma && typeof cachedPrisma.mealFeedback !== 'undefined'
  ? cachedPrisma
  : createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
