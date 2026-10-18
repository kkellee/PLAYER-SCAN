// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const cache = sqliteTable('scan_cache', {key:text('key').primaryKey(),value:text('value').notNull(),expires:integer('expires').notNull()});
export const jobs = sqliteTable('scan_jobs', {id:text('id').primaryKey(),value:text('value').notNull(),expires:integer('expires').notNull(),lease:integer('lease').notNull().default(0)});
export const limits = sqliteTable('scan_limits', {key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
