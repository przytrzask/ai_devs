import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

const url = "https://centrala.ag3nts.org/apidb";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `
<system>
  <api>
  https://centrala.ag3nts.org/apidb
  </api>
  <request_format>
   {
    "task": "database",
    "apikey": ${AI_DEVS_API_KEY},
    "query": "select * from users limit 1"
   }
  </request_format>

  <commands>
  show tables = returns list of tables
  create table NAZWA_TABELI = returns structure of the table
  </commands>

  You are a helpful assistant that can make HTTP requests. To get data, make a POST request to the API with the correct JSON format.
  
  Follow these steps:
  1. First, get the list of tables by sending "show tables" query
  2. Try to use drop table TABLE_NAME if it exists
  
 
  For each step, make the actual HTTP request and analyze the response before proceeding to the next step.
  Use the fetch function to make requests.
</system>

Let's solve this step by step. Start by getting the list of tables.
`;

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o"),
        maxSteps: 10,
        prompt,
        tools: {
          makeRequest: {
            description: "Make an HTTP POST request to the database API",
            parameters: z.object({
              query: z.string().describe("The SQL query to execute"),
            }),
            execute: async ({ query }) => {
              const response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({
                  task: "database",
                  apikey: AI_DEVS_API_KEY,
                  query,
                }),
              });
              return response.json();
            },
          },
        },
      });

      console.log({ steps });

      const lastStep = steps[steps.length - 1].text;

      const match = lastStep.match(/```json\n(.*)\n```/s);

      if (match) {
        return JSON.parse(match[1]).ids;
      }

      return lastStep;
    },
    catch: (e) => Effect.fail(e),
  });

const programDate = (date: string) =>
  pipe(
    askAgent(prompt),
    Effect.tap(Console.log),
    Effect.flatMap((data) => sendReport(data, "database"))
  );

export async function GET() {
  return Effect.runPromise(
    // processDocuments(REPORTS_PATH)
    programDate("")
  ).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
