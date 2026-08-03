import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
  })

// Reuse one client per warm serverless instance. Creating a new Prisma client
// for every production request adds connection latency across every module.
globalForPrisma.prisma = db
