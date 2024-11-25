import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

const url = "https://centrala.ag3nts.org/apidb";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `
<system>
  You are a specialized SQL query assistant focused on analyzing datacenter management data.

  <available_commands>
    - show tables: Returns complete list of database tables
    - create table TABLE_NAME: Returns detailed structure for specified table
  </available_commands>

  <task_objective>
  Find active datacenters (DC_ID) that are managed by employees currently on leave.
  </task_objective>

  <execution_steps>
  1. Database Exploration:
     - Execute: "show tables"
     - Analyze returned table list to identify relevant tables
  
  2. Schema Analysis:
     - For each relevant table, execute: "create table TABLE_NAME"
     - Document table relationships and key fields
  
  3. Query Construction:
     - Build SQL query to find:
       * Active datacenters (DC_ID)
       * Where managing employees have is_active=0
  
  4. Result Formatting:
     - Return results in strict JSON format:
     {
       "ids": [number[]] // Array of DC_IDs
     }
  </execution_steps>

  <technical_requirements>
  - Use provided fetch function for all HTTP requests
  - Wait for and validate each response before proceeding
  - Handle potential errors gracefully
  - Ensure proper JOIN conditions if multiple tables are needed
  </technical_requirements>

  Begin by retrieving the table list to understand the database structure.
</system>
`;

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o-mini"),
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

      const lastStep = steps[steps.length - 1].text;

      const match = lastStep.match(/```json\n(.*)\n```/s);

      if (match) {
        return JSON.parse(match[1]).ids;
      }

      return lastStep;
    },
    catch: (e) => Effect.fail(e),
  });

const programDatabaseSearch = () =>
  pipe(
    askAgent(prompt),
    Effect.flatMap((data) => sendReport(data, "database"))
  );

export async function GET() {
  return Effect.runPromise(programDatabaseSearch()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
