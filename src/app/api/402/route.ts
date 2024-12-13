import { Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

const reportUrl = "https://centrala.ag3nts.org/report";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `

`;

const notesPath = process.cwd() + "/src/app/api/305/files/database.json";

const programDatabaseSearch = () =>
  pipe(
    Effect.succeed(1),
    Effect.flatMap(() => sendReport(["01", "02", "10"], "research"))
  );

export async function GET() {
  return Effect.runPromise(programDatabaseSearch()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
