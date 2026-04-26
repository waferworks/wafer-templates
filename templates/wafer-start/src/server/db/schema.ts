import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  primaryEmail: text("primary_email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    primaryEmail: text("primary_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("auth_identities_provider_provider_user_id_key").on(
      table.provider,
      table.providerUserId
    ),
  ]
);

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
