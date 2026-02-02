import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from './utils/sqlite-drizzle-utils';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  ...timestamps(),
});
