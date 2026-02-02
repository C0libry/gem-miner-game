import { sql } from 'drizzle-orm';
import { int } from 'drizzle-orm/sqlite-core';

export const nowMs = sql<number>`(unixepoch() * 1000)`;

export const withUpdatedAt = <T extends object>(data: T) => ({
  ...data,
  updatedAt: Date.now(),
});

export const timestamps = () => ({
  createdAt: int('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(nowMs),

  updatedAt: int('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(nowMs),
});

export const softDelete = () => ({
  deletedAt: int('deleted_at', { mode: 'timestamp_ms' }),
});

export const versioned = () => ({
  version: int('version').notNull().default(1),
});
