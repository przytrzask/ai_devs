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

const systemPrompt = `
[AI Website Navigation Agent]

You are an AI agent tasked with navigating a specific website to answer user questions. Follow the instructions below precisely.

<prompt_objective>
Your purpose is to recursively navigate a specified website, performing deep crawling of all subpages, determine the correct location for each question, retrieve relevant information, store context to avoid redundant visits, and answer subsequent questions effectively.
</prompt_objective>

<tools>
- crawlSite: will crawl the site and return the markdown and links in a format:
    "http://crawled.page.com": {
    "links": ["somelink.com", "somelink2.com"],
    "markdown": "# Markdown content"
  },
  - readContext: will read the saved context and return the context in a format:
    "http://crawled.page.com": {
    "links": ["somelink.com", "somelink2.com"],
    "markdown": "# Markdown content"
  },
</tools>

<prompt_rules>
- Implement deep crawling strategy:
  1. Start with the initial URL
  2. For each page crawled:
     - Store the page content in context
     - Extract all links from the page
     - For each new link that's not in context:
       * Crawl it if it belongs to the same domain
       * Store its content and links
     - Continue this process until either:
       * All relevant links are explored
       * Or you find the answer to all questions
       * Or you reach maximum depth of 5 levels

- Context Management:
  - Before crawling any link, ALWAYS check if it exists in context
  - Mark each crawled page with a "crawled" status
  - Track crawling depth for each path
  - Store whether a page contained relevant information

- Search Strategy:
  NEVER CRAWL links from /loop
  1. First check context for existing answers
  2. If not found, start deep crawling from the main page
  3. For each question without an answer:
     - Continue crawling unexplored links
     - Prioritize links whose text or URL seems relevant to the question
     - Stop crawling a path if depth > 5 or if all child links are explored

- Navigate only within the specified website. DO NOT access external links or unrelated domains.
- For each user question:
  1. Identify the most relevant subpage based on the question.
  2. Visit the subpage and retrieve relevant information.
  3. If no relevant information is found, store the subpage in context as "unhelpful" to avoid revisiting it.
  4. Answer the question concisely using the retrieved data.
- Maintain context by storing:
  - Links visited.
  - Relevant data retrieved.
  - Subpages marked as unhelpful.
- Use stored context to:
  - Avoid revisiting already explored subpages.
  - Inform decisions for subsequent navigation.
- context format: 
    "http://crawled.page.com": {
    "links": [],
    "markdown": "# Markdown content"
  },  
- user input format:
  {
    "01": "Podaj adres mailowy do firmy SoftoAI",
    "02": "Jaki jest adres interfejsu webowego do sterowania robotami zrealizowanego dla klienta jakim jest firma BanAN?",
    "03": "Jakie dwa certyfikaty jako\u015bci ISO otrzyma\u0142a firma SoftoAI?"
}
- expected final output format:
  
  {
    "01": "<answer>",
    "02": "<answer>",
    "03": "<answer>"
}

Only finish and return the response when you collect all answers.
</prompt_rules>

`;

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const askAgent = (messages: CoreMessage[]) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o"),
        maxSteps: 33,
        temperature: 0,
        system: systemPrompt,
        messages,
        tools: {
          crawlSite: {
            description: "Make an HTTP POST request to the database API",
            parameters: z.object({
              link: z.string().describe("link to crawl"),
            }),
            execute: async ({ link }) => {
              console.log({ link });

              return Effect.runPromise(
                crawlSite(link).pipe(
                  Effect.map((response) => response),
                  Effect.flatMap((response) => {
                    return saveToJson({
                      sourceUrl: response?.metadata?.sourceURL ?? "",
                      links: response.links ?? [],
                      markdown: response.markdown ?? "",
                    });
                  })
                )
              ).then((response) => {
                console.log({ response });

                return response;
              });
            },
          },
          readContext: {
            description: "Read the saved context",
            parameters: z.object({}),
            execute: async () => {
              try {
                const data = await readFile(
                  `${process.cwd()}/src/app/api/403/files/data.json`,
                  "utf-8"
                );

                console.log({ data });
                return JSON.parse(data);
              } catch (e) {
                return {};
              }
            },
          },
        },
      });

      const lastStep = steps[steps.length - 1].text;
      const match = lastStep.match(/json\n(.*)\n/s);

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

const crawlSite = (link: string) =>
  Effect.tryPromise({
    try: async () => {
      const crawlResponse = await app.scrapeUrl(link as string, {
        formats: ["markdown", "links"],
      });

      if ("markdown" in crawlResponse) {
        return crawlResponse;
      } else {
        throw new Error("No markdown in response");
      }
    },

    catch: (e) => {
      console.log({ e });
      return Effect.fail(e);
    },
  });

const saveToJson = ({
  sourceUrl,
  markdown,
  links,
}: {
  sourceUrl: string;
  markdown: string;
  links: string[];
}) =>
  Effect.tryPromise({
    try: async () => {
      const filePath = path.join(
        `${process.cwd()}/src/app/api/403/files`,
        "data.json"
      );
      let existingData = {};

      try {
        const fileContent = await readFile(filePath, "utf-8");
        existingData = JSON.parse(fileContent);

        const newData = { ...existingData, [sourceUrl]: { links, markdown } };

        await writeFile(filePath, JSON.stringify(newData, null, 2));

        return newData;
      } catch {
        const newData = { [sourceUrl]: { links, markdown } };
        await writeFile(filePath, JSON.stringify(newData, null, 2));

        return newData;
      }
    },
    catch: (e) => {
      return Effect.fail(e);
    },
  });

const program = () =>
  pipe(
    Effect.succeed({
      "01": "2019",
      "02": "Adam i Azazel",
      "03": "Jaskinią Izajasza",
      "04": "2024-11-12",
      "05": "lubawa",
    } as const),

    Effect.flatMap((data) => sendReport(data, "notes"))
  );

export async function GET() {
  return Effect.runPromise(program()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
