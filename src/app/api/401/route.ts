import { Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { z } from "zod";

const reportUrl = "https://centrala.ag3nts.org/report";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `
<system>

<saved_data>
'Barbara ma brązowe włosy, nosi okulary i ma migdałowe, jasnobrązowe oczy. Na zdjęciu IMG_1410_FXER.PNG widać jej charakterystyczny pieprzyk nad prawą brwią. Na zdjęciu IMG_1443_FT12.PNG można zauważyć tatuaż na lewym ramieniu. Barbara ma czarne włosy.
</saved_data>

You are a specialized photo analysis assistant focused on identifying and describing a person named Barbara across multiple photographs.

<task_objective>
Use the saved description data as a base reference to identify Barbara in the photos. Verify and refine this description based on what you see in the actual photos.
IMPORTANT: Continue the analysis until you receive a response containing { "FLG": "..." }. When you receive this flag, return it exactly as provided.

<analysis_steps>
1. Initial Review:
   - Begin by calling makeRequest with { "message": "START" }
   - Use the saved description to help identify Barbara in the photos
   - Verify if the photos match the saved description
   - Note any discrepancies or additional details
   
2. Image Enhancement:
   - If needed, use available commands to better verify the saved description details
   - Pay special attention to the distinctive beauty mark and other specific features mentioned
   
3. Description Refinement:
   - Compare what you see in photos with the saved description
   - Create updated descriptions incorporating both the saved data and new observations
   - Focus on confirming or correcting each feature from the saved description

4. Submission Process:
   - Send descriptions using makeRequest
   - Check each response for { "FLG": "..." }
   - If no flag is received, continue refining based on both saved data and photos

<available_commands>
To interact with the system, you must use the makeRequest function with a message parameter in this format:
{
  "message": "YOUR_COMMAND"
}

Available commands:
- "START": Request initial photos
- "DARKEN IMG_NAME.PNG": Increases image darkness
- "BRIGHTEN IMG_NAME.PNG": Increases image brightness
- "REPEAIR IMG_NAME.PNG": Adjusts photo quality

<output_requirements>
- very important ignore IMG_559_FGR4.PNG file description and do not use it in your analysis
- Use saved description as your starting point for identification
- After each makeRequest, check if the response contains a "FLG" field
- If you receive { "FLG": "..." }, return it exactly as provided
- If no flag is received, continue the analysis and description process
- Do not stop or return any other format until you receive the flag
- send final description in Polish using makeRequest-
- for hair color use ciemne or czarne 
- find out if she has a tatoo and where is it



Begin by calling makeRequest with { "message": "START" } to receive the initial set of photos.
Remember: Only finish and return the response when you receive a { "FLG": "..." } format.
</system>
`;

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o"),
        maxSteps: 100,
        temperature: 0,
        prompt,
        tools: {
          makeRequest: {
            description: "Make an HTTP POST request to the database API",
            parameters: z.object({
              message: z.string().describe(""),
            }),
            execute: async ({ message }) => {
              console.log({ message });
              const response = await fetch(reportUrl, {
                method: "POST",
                body: JSON.stringify({
                  task: "photos",
                  apikey: AI_DEVS_API_KEY,
                  answer: message,
                }),
              });

              const data = await response.json();
              console.log({ data });
              return data;
            },
          },
        },
      });

      const lastStep = steps[steps.length - 1].text;
      const match = lastStep.match(/```json\n(.*)\n```/s);

      console.log({ lastStep, steps });

      if (match) {
        return JSON.parse(match[1]);
      }

      return lastStep;
    },
    catch: (e) => {
      console.log({ e });
      return Effect.fail(e);
    },
  });

const notesPath = process.cwd() + "/src/app/api/305/files/database.json";

const programDatabaseSearch = () =>
  pipe(
    // readFile(`${process.cwd()}/src/app/api/305/files`, "database.json"),
    // Effect.flatMap(toJSON),
    // Effect.flatMap(importData)
    // askAgent(prompt),
    // Effect.flatMap((data) => writeFile(notesPath, data))

    // Effect.flatMap((data) => sendReport(data, "database"))
    Effect.succeed(1),
    Effect.flatMap(() => askAgent(prompt))
  );

export async function GET() {
  return Effect.runPromise(programDatabaseSearch()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
