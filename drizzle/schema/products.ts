import { sqliteTable, text, integer, numeric } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['template', 'tool', 'website'] }).notNull(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  description: text('description'),
  price: numeric('price'),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull(),
  icon: text('icon'),
  thumbnail: text('thumbnail'),
  link: text('link').notNull(),
  isNew: integer('is_new', { mode: 'boolean' }),
  isFeatured: integer('is_featured', { mode: 'boolean' }),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
}); 