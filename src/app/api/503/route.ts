import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

import { readFile, writeFile } from "fs/promises";
import path from "path";

import FirecrawlApp from "@mendable/firecrawl-js";
import { ResearchAgent } from "./agent";

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const agent = new ResearchAgent();

const res = agent.research("fdsdf").print();

export async function GET() {
  return Effect.runPromise(res.pipeline).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
