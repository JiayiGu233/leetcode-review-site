import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const progress = sqliteTable("progress", {
  problemId: text("problem_id").primaryKey(),
  solved: integer("solved", { mode: "boolean" }).notNull().default(false),
  mastery: integer("mastery").notNull().default(0),
  dueAt: integer("due_at"),
  lastReviewedAt: integer("last_reviewed_at"),
  reviewCount: integer("review_count").notNull().default(0),
});

export const customProblems = sqliteTable("custom_problems", {
  id: text("id").primaryKey(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    problemId: text("problem_id").notNull(),
    kind: text("kind", { enum: ["learn", "review"] }).notNull(),
    activityDate: text("activity_date").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_activities_date_kind").on(table.activityDate, table.kind)]
);
