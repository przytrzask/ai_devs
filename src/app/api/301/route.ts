import { Effect, pipe, Console, Schema, Array, Option, Either } from "effect";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import fs, { readdir } from "node:fs";

import { TextSplitter } from "./textSplitter";
import { sendReport } from "@/app/services/sendReport";
import { HttpError } from "@/app/types/errors";

const createPrompt = (
  database: string
) => `Extract and prioritize keywords from a provided JSON input of reports and a facts database. The process must prioritize extracting person-related keywords from the database if a match can be found, using contextual clues such as filenames or report content. If no match is found in the database, or if the report is not about persons, create relevant keywords directly from the report text.

Objective:
1. Extract up to 10 keywords from each report. If the report is about persons and a match exists in the database, prioritize extracting keywords from the database.
2. If the report is not about persons, generate relevant keywords from the report text.
3. Always include the sector identifier (e.g., "D3") as the first keyword in the output.

Facts Database:
${database}


<Rules>
ALL keywords must be in lowercase.
MOST IMPORTANT If a match is found in the database, extract the following if applicable:
- Profession
- Name
- Affiliations
- Skills
If person is captured add "captured" to keywords.
ALWAYS return one word as a keyword.
YOU CAN divide phrase to keywords if it is necessary.
 If no match is found in the database or if the report is not about persons:
   - Extract up to 10 keywords from the report text.
   - Focus on nouns or noun phrases related to the context (e.g., professions, events, topics).
 Limit the output to between 8 and 10 keywords.
 Output should always be in JSON format, with the structure:
   - { "file-name-01-sektor_D3.txt": "D3, keyword1, keyword2, ..." }
 Handle each report independently and ensure consistent output for all inputs.

Examples:

Input:
{
  "file-name-01-sektor_D3.txt": "we found a person near the university.",
  "file-name-02-sektor_F7.txt": "She is a programmer who teaches others.",
  "file-name-03-sektor_C5.txt": "Automated factories are becoming a cornerstone of industry.",
  "file-name-04-sektor_A1.txt": "The lab assistant is working on memory modification technologies.",
  "file-name-05-sektor_X1.txt": "Advancements in AI are shaping the future of technology."
}

Facts Database:
[
  {
    "fileName": "f04.txt",
    "character": {
      "name": "Tomasz Zimowski",
      "profession": "English teacher",
      "affiliations": ["School No. 9 in Grudziądz", "Resistance Movement"],
      "skills": ["Creative teaching", "Community involvement", "Programming (Java)"],
      "notable_actions": ["Criticized the robot regime", "Organized secret meetings against AI control"]
    }
  },
  {
    "fileName": "f08.txt",
    "character": {
      "name": "Grzegorz Gospodarczyk",
      "profession": "Programmer, recruiter",
      "affiliations": ["Resistance Movement"],
      "skills": ["Advanced programming", "AI system bypass techniques", "Recruitment and training"],
      "notable_actions": ["Trained resistance agents", "Maintained covert operations"]
    }
  },
  {
    "fileName": "f06.txt",
    "character": {
      "name": "Azazel",
      "profession": "Unknown",
      "affiliations": ["Resistance Movement"],
      "skills": ["Teleportation", "Knowledge of future technologies", "Industrial automation expertise"],
      "notable_actions": ["Presence in strategic automated factories"]
    }
  }
]

Expected Output:
{
  "file-name-01-sektor_D3.txt": "D3, Tomasz, Zimowski, teacher, community, involvement, programming, java",
  "file-name-02-sektor_F7.txt": "F7, Grzegorz, Gospodarczyk, programmer, recruiter, programming, Resistance, Movement, training",
  "file-name-03-sektor_C5.txt": "C5, factories, automation, industry, cornerstone, strategic",
  "file-name-04-sektor_A1.txt": "A1, lab assistant, memory modification, nanotechnology, research",
  "file-name-05-sektor_X1.txt": "X1, AI, advancements, technology, future, innovation"
} `;

const FACTS_PATH = process.cwd() + "/src/app/api/301/files/facts";
const REPORTS_PATH = process.cwd() + "/src/app/api/301/files/reports";

export const ReportData = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});

const textSplitter = new TextSplitter();

const getAllTextFiles = (path: string) =>
  Effect.async<string[], NodeJS.ErrnoException | null>((resume) => {
    readdir(path, (error, files) => {
      if (error) {
        resume(Effect.fail(error));
      } else {
        console.log({
          files,
        });

        resume(Effect.succeed(files));
      }
    });
  });

const getFile = (path: string, fileName: string) =>
  Effect.async<
    {
      data: string;
      fileName: string;
    },
    NodeJS.ErrnoException | null
  >((resume) => {
    fs.readFile(`${path}/${fileName}`, "utf8", (error, data) => {
      resume(error ? Effect.fail(error) : Effect.succeed({ fileName, data }));
    });
  });

const getMetadataFile = getFile(FACTS_PATH, "metadata.json");

const writeFile = (path: string, data: string) =>
  Effect.async<void, NodeJS.ErrnoException | null>((resume) => {
    fs.writeFile(path, data, (error) => {
      resume(error ? Effect.fail(error) : Effect.succeed("File written"));
    });
  });

const createDocMetadata = (text: string) =>
  Effect.tryPromise({
    try: async () => {
      const tokens = await textSplitter.split(text, 1000);

      console.log({ tokens });
      return tokens;
    },
    catch: (error) => {
      Effect.fail(error);
    },
  });

const createFactsMetadataProgram = pipe(
  getAllTextFiles(FACTS_PATH),
  Effect.flatMap((files) =>
    Effect.all(files.map((file) => getFile(FACTS_PATH, file)))
  ),
  //   Effect.flatMap((texts) => Effect.all(texts.map(createDocMetadata))),
  Effect.flatMap((data) =>
    writeFile(
      `${FACTS_PATH}/metadata.json`,
      JSON.stringify(data.map(({ fileName, data }) => data))
    )
  )
);

const reportKeywordsProgram = pipe(
  getAllTextFiles(REPORTS_PATH),
  Effect.flatMap((files) =>
    Effect.all(files.map((file) => getFile(REPORTS_PATH, file)))
  )
);

const report = Effect.all([getMetadataFile, reportKeywordsProgram]).pipe(
  Effect.map(([metadata, keywords]) => {
    const record = keywords.reduce(
      (acc, { fileName, data }) => ({
        ...acc,
        [fileName]: data,
      }),
      {} as Record<string, string>
    );

    return askAi(createPrompt(metadata.data), JSON.stringify(record));
  }),
  Effect.flatMap((data) => data),
  Effect.flatMap((data) => sendReport(data, "dokumenty")),

  Effect.tap(Console.log)
);

export async function GET() {
  return Effect.runPromise(report).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}

export const askAi = (prompt: string, userPrompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const answerResoponse = await generateObject({
        model: openai("gpt-4o"),
        temperature: 0,
        output: "object",
        schema: z.record(z.string(), z.string()),
        mode: "json",

        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const response = answerResoponse.toJsonResponse();

      return await response.json();
    },

    catch: (e) => {
      console.log({ e });

      return new HttpError(e);
    },
  });
