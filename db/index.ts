// import { env } from "cloudflare:workers";
// import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = { findMany: async () => [], findFirst: async () => null,
    findUnique: async () => null, create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, delete: async () => ({}) };
  const db = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : prop === 'select' ? () => new Proxy({}, { get: () => new Proxy({}, { get: () => async () => [] })}) : async () => [],
  });
  return db as any;
}
