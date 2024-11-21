import {
  pgTable,
  text,
  timestamp,
  vector,
  serial,
  index,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    date: timestamp("date").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },

  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type Document = typeof documents.$inferSelect;
