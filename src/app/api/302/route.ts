import OpenAI from "openai";

import { Effect, pipe, Console, Schema } from "effect";

import { db } from "./db";
import { documents } from "./schema";

import fs, { readdir } from "node:fs";
import { parseFileContent } from "./utils";
import { gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql";
import { sendReport } from "@/app/services/sendReport";
import { desc } from "drizzle-orm/expressions";
import { asc } from "drizzle-orm/sql/expressions";

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

const insertDocument = ({
  title,
  description,
  date,
}: {
  title: string;
  description: string;
  date: Date;
}) =>
  Effect.tryPromise({
    try: async () => {
      const embedding = await generateEmbedding(description);

      await db.insert(documents).values({
        title,
        description,
        date,
        embedding,
      });
    },
    catch: (e) => {
      Effect.fail(e);
    },
  });

const getFile = (path: string, fileName: string) =>
  Effect.async<
    {
      title: string;
      description: string;
      date: Date;
    },
    NodeJS.ErrnoException | null
  >((resume) => {
    fs.readFile(`${path}/${fileName}`, "utf8", (error, data) => {
      const parsed = parseFileContent(data, fileName);

      resume(error ? Effect.fail(error) : Effect.succeed(parsed));
    });
  });

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

const REPORTS_PATH = "./src/app/api/do-not-share";

const processDocuments = (path: string) =>
  pipe(
    getAllTextFiles(path),
    Effect.flatMap((files) =>
      Effect.all(files.map((file) => getFile(path, file)))
    ),
    Effect.flatMap((docs) => Effect.all(docs.map((doc) => insertDocument(doc))))
  );

const getDocument = (query: string) =>
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
          date: sql<string>`TO_CHAR((${documents.date} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Warsaw')::DATE, 'YYYY-MM-DD')`,

          similarity,
        })
        .from(documents)
        .where(gt(similarity, 0.85))
        .orderBy((t) => desc(t.similarity))
        .limit(5);

      return similarDocs;
    },
    catch: (e) => {
      Effect.fail(e);
    },
  });

//   const formatDate = (dateString: string )

const findDocumentDateProgrambyQuery = (query: string) =>
  pipe(
    getDocument(query),
    Effect.tap(Console.log),
    Effect.map((docs) => docs[0]),
    Effect.tap(Console.log),
    Effect.flatMap((doc) => sendReport(doc.date, "wektory"))
  );

export async function GET() {
  return Effect.runPromise(
    // processDocuments(REPORTS_PATH)
    findDocumentDateProgrambyQuery(
      "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?"
    )
  ).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
