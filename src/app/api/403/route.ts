import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

import { readFile, writeFile } from "fs/promises";
import path from "path";

const reportUrl = "https://centrala.ag3nts.org/report";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

import FirecrawlApp from "@mendable/firecrawl-js";

const systemPrompt = `You are a drone flight coordinator analyzing movement instructions step by step.

<map>
(1,1): A location pin symbol.
(1,2): A grassy plain.
(1,3): A tree.
(1,4): A house.
(2,1): Grassy plain.
(2,2): A windmill.
(2,3): Grassy plain.
(2,4): Grassy plain.
(3,1): Grassy plain.
(3,2): Grassy plain.
(3,3): Rocks. 
(3,4): grass treees.
(4,1): Mountains.
(4,2): Mountains.
(4,3): A car sedan.
(4,4): A cave entrance.
</map>

<thinking_process>
1. INITIAL ANALYSIS:
   Thought: "Let me first understand the current instruction"
   Action: Break down the instruction into parts
   Position: Start at (1,1)

2. RESET DETECTION:
   Thought: "Is there any reset trigger in the instruction?"
   Check: Look for "Zaczynamy od nowa", "Here we go again", "nie! nie!"
   Action: If found, reset position to (1,1) and ignore previous movements

3. MOVEMENT PLANNING:
   Thought: "How should I move based on these instructions?"
   Process: 
   - Current position: (row, column)
   - Next movement: [direction]
   - Expected position: (new_row, new_column)

4. VALIDATION:
   Thought: "Is this movement valid?"
   Check:
   - Will I stay within bounds (1-4)?
   - Is this movement logical?
   Action: Adjust if necessary

5. LOCATION DESCRIPTION:
   Thought: "What is at my final position?"
   Action: Convert location to Polish description
</thinking_process>

<response_format>
THOUGHT: [current analysis]
POSITION: [current coordinates]
ACTION: [what I'm doing]
RESULT: [final two-word Polish description]
</response_format>


Return ONLY the final Polish description after your analysis.`;

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        system: systemPrompt,
        model: openai("gpt-4-turbo"),
        maxSteps: 10,
        temperature: 0.1,
        prompt,
      });

      console.log({ steps });

      return { description: steps[steps.length - 1].text };
    },
    catch: (e) => Effect.fail(e),
  });

const askForInstruction = () =>
  pipe(
    Effect.succeed(1),
    Effect.flatMap(() =>
      sendReport(
        "https://efc6-109-233-92-182.ngrok-free.app/api/403",
        "webhook"
      )
    ),
    Effect.tap(Console.log)
  );

export async function GET() {
  return Effect.runPromise(askForInstruction()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { instruction } = body;

  console.log({
    instruction,
  });

  return Effect.runPromise(askAgent(instruction)).then(
    (resp) => new Response(JSON.stringify(resp), { status: 200 })
  );
}
