import { Effect, pipe } from "effect";
import { OpenAI } from "openai";

import fs, { readdir } from "node:fs";
import { gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql";
import { sendReport } from "@/app/services/sendReport";
import { desc } from "drizzle-orm/expressions";

import { documents } from "../schema";

import { type Document } from "../schema";

type DocumentContent = Pick<Document, "title" | "description">;

import { db } from "../db";

const insertDocument = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) =>
  Effect.tryPromise({
    try: async () => {
      console.log({ title, description });

      const embedding = await generateEmbedding(description);

      await db.insert(documents).values({
        title,
        description,
        embedding,
      });
    },
    catch: (e) => {
      console.error(e);
      Effect.fail(e);
    },
  });

export const parseFileContent = (
  content: string,
  fileName: string
): DocumentContent => {
  const trimmedContent = content.trim();
  const words = trimmedContent.split(/\s+/);

  return {
    title: words.slice(0, 2).join(" "),
    description: words.slice(2).join(" "),
  };
};

const parseFileName = (fileName: string): Date => {
  const [year, month, day] = fileName.replace(".txt", "").split("_");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

export const toJSON = (data: string) =>
  Effect.tryPromise({
    try: async () => {
      return await JSON.parse(data);
    },
    catch: (error) => {
      return Effect.fail(error);
    },
  });

const getFile = (path: string, fileName: string) =>
  Effect.async<
    {
      title: string;
      description: string;
    },
    NodeJS.ErrnoException | null
  >((resume) => {
    fs.readFile(`${path}/${fileName}`, "utf8", (error, data) => {
      const parsed = parseFileContent(data, fileName);

      resume(error ? Effect.fail(error) : Effect.succeed(parsed));
    });
  });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  return response.data[0].embedding;
}

const getAllTextFiles = (path: string) =>
  Effect.async<string[], NodeJS.ErrnoException | null>((resume) => {
    readdir(path, (error, files) => {
      if (error) {
        resume(Effect.fail(error));
      } else {
        resume(Effect.succeed(files));
      }
    });
  });

export const processDocuments = (path: string) =>
  pipe(
    getAllTextFiles(path),
    Effect.flatMap((files) =>
      Effect.all(files.map((file) => getFile(path, file)))
    ),
    Effect.flatMap((docs) => Effect.all(docs.map((doc) => insertDocument(doc))))
  );

export const getDocument = (query: string) =>
  Effect.tryPromise({
    try: async () => {
      const embedding = await generateEmbedding(query);

      const similarity = sql<number>`1 - (${cosineDistance(
        documents.embedding,
        embedding
      )})`;
      const similarDocs = await db
        .select({
          description: documents.description,
          title: documents.title,
          similarity,
        })
        .from(documents)
        .where(gt(similarity, 0.65))
        .orderBy((t) => desc(t.similarity))
        .limit(5);

      return similarDocs;
    },
    catch: (e) => {
      Effect.fail(e);
    },
  });
