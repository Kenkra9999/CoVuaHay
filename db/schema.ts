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
  whiteName: text("white_name").notNull().default("Kỳ thủ Trắng"),
  blackName: text("black_name").notNull().default("Kỳ thủ Đen"),
  totalSeconds: integer("total_seconds").notNull().default(900),
  moveLimitSeconds: integer("move_limit_seconds").notNull().default(120),
  whiteRemainingMs: integer("white_remaining_ms").notNull().default(900000),
  blackRemainingMs: integer("black_remaining_ms").notNull().default(900000),
  turnStartedAt: integer("turn_started_at"),
  endReason: text("end_reason"),
  drawOffer: text("draw_offer"),
  whiteSeenAt: integer("white_seen_at"),
  blackSeenAt: integer("black_seen_at"),
});
