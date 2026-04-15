import { PrismaClient } from '@prisma/client';

// Singleton pattern for serverless: reuse connection across warm invocations
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
