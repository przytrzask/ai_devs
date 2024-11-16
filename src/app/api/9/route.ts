import { HttpError } from "@/app/types/errors";
import FirecrawlApp from "@mendable/firecrawl-js";
import { Console, Effect } from "effect";

import fs from "node:fs";

import { pipe } from "effect";

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const siteUrl = "https://centrala.ag3nts.org/dane/arxiv-draft.html";

const notesPath = process.cwd() + "/src/app/api/9/files/notes.md";

export const readMarkdown = (path: string) => {
  return Effect.async((callback) => {
    const fileContents = fs.readFileSync(path, "utf8");

    callback(Effect.succeed(fileContents));
  });
};

const program = pipe(
  Effect.succeed(notesPath),
  Effect.flatMap((path) => readMarkdown(path)),
  Effect.tap(Console.log)
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
