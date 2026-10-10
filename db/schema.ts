import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  whiteToken: text("white_token").notNull(),
  blackToken: text("black_token"),
  fen: text("fen").notNull(),
  movesJson: text("moves_json").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
