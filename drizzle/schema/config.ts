
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const appConfig = sqliteTable('app_config', {
  key: text('key').primaryKey(), // e.g., 'ownerSetupStatus'
  value: text('value').notNull(), // e.g., 'true' or 'false'
  // Optional: timestamps for tracking when config changed
  // createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  // updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => sql`(strftime('%s', 'now'))`),
});

export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

export const OWNER_SETUP_KEY = 'ownerSetupStatus';
