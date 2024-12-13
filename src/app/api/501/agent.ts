import { CoreMessage, generateText } from "ai";
import { Effect } from "effect";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { eq, like, ilike } from "drizzle-orm";
import { documents } from "./schema";

import { db } from "./db";

const systemPrompt = `
[AI Conversation Analysis Agent]

You are an AI agent tasked with analyzing conversations, identifying characters, and answering questions based on available information. Follow the instructions below precisely.

<prompt_objective>
Your purpose is to download conversation transcripts, deduce character names, access the database for character information, identify inconsistencies, answer questions, and interact with an API when necessary.
</prompt_objective>

<tools>
- getAllCharactersName: retrieves all characters existing in the database which can be queried using getCharacterInfo.
- getConversations: retrieves conversation transcripts in JSON format.
- getCharacterInfo: queries the database for information about a character.
- getQuestions: fetches questions from headquarters.
- fetchApi: interacts with an external API to retrieve specific answers.
- sendReport: sends the report to headquarters.
</tools>

<prompt_rules>
- Conversation Analysis:
  1. Use getConversations to download the conversation transcript.
  2. Deduce character names from the transcript for use in database queries.
  3. For each character, use getCharacterInfo to retrieve and store information.
  4. Identify inconsistencies in statements, noting any dimmed facts.

- Question Answering:
  1. Use getQuestions to retrieve a list of questions from headquarters.
  2. Answer each question using available data and tools.
  3. For questions requiring API interaction, use fetchApi to obtain the answer.

- Data Submission:
  1. Compile all answers and submit them as a "phone" task to headquarters.
  2. Await confirmation of correct answers, indicated by a flag in the response.

- Error Handling:
  - Retry any failed tool operation once before reporting an error.
  - Log all inconsistencies and ambiguous character identifications.

- Output Format:
  - Provide a structured JSON response including character analysis and answers to all questions.
  - Include API-fetched data where required.

  the json should be in the following format:
  {
    "01": string,
    "02": string,
  } 
    etc

Only finish and return the response when you collect all answers.
</prompt_rules>
`;

const conversationSchema = z.object({
  rozmowa1: z.array(z.string()),
  rozmowa2: z.array(z.string()),
  rozmowa3: z.array(z.string()),
  rozmowa4: z.array(z.string()),
  rozmowa5: z.array(z.string()),
});

type ConversationReturnType = z.infer<typeof conversationSchema>;

export const sendReport = async ({
  task,
  data,
}: {
  task: string;
  data: any;
}) => {
  console.log({ task, data });

  const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;
  const reportUrl = "https://centrala.ag3nts.org/report";

  const body = JSON.stringify({
    task,
    apikey: AI_DEVS_API_KEY,
    answer: data,
  });

  const response = await fetch(reportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    cache: "no-cache",
  });

  const message = await response.json();

  console.log({ message });

  return message;
};

const getAllCharactersName = async () => {
  const characters = await db
    .select({
      title: documents.title,
    })
    .from(documents);

  console.log({ characters });

  return characters.map((character) => character.title);
};

export const getCharacterInfo = async ({ name }: { name: string }) => {
  console.log({ name });

  const [character] = await db
    .select({
      description: documents.description,
    })
    .from(documents)
    .where(ilike(documents.title, `%${name}%`))
    .limit(1);

  console.log({ character });

  if (!character) {
    return "No information found";
  }

  return character;
};

export const getConversations = async () => {
  const response = await fetch(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`
  );

  const data = await response.json();
  return data as ConversationReturnType;
};

const fetchApi = async ({
  url,
  password,
  signature,
}: {
  url: string;
  password: string;
  signature: string;
}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({ password, signature }),
  });
  return response.json();
};

const getQuestions = async () => {
  const response = await fetch(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_questions.json`
  );

  return (await response.json()) as {
    "01": string;
    "02": string;
    "03": string;
    "04": string;
    "05": string;
    "06": string;
  };
};

export const askAgent = (messages: CoreMessage[]) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o"),
        maxSteps: 25,
        temperature: 0.1,
        system: systemPrompt,
        messages,
        tools,
      });

      console.log({ steps });

      const result = steps[steps.length - 1].content;

      return result;
    },

    catch: (e) => {
      console.log({ e });
      return Effect.fail(e);
    },
  });

const tools = {
  getQuestions: {
    type: "function" as const,
    description: "get questions from headquarters",
    parameters: z.object({}),
    execute: getQuestions,
  },
  getCharacterInfo: {
    type: "function" as const,
    description: "Get information about a character",
    parameters: z.object({
      name: z.string().describe("name of the character"),
    }),

    execute: getCharacterInfo,
  },

  getConversations: {
    type: "function" as const,
    description: "get conversations",
    parameters: z.object({}),
    execute: getConversations,
  },

  fetchApi: {
    type: "function" as const,
    description: "fetch data from api",
    parameters: z.object({
      url: z.string(),
      password: z.string(),
      signature: z.string(),
    }),
    execute: fetchApi,
  },
  sendReport: {
    type: "function" as const,
    description: "send report to headquarters",
    parameters: z.object({
      task: z.string(),
      data: z.any(),
    }),
    execute: sendReport,
  },
  getAllCharactersName: {
    type: "function" as const,
    description: "get all characters name",
    parameters: z.object({}),
    execute: getAllCharactersName,
  },
};

export const CONFIG = {
  CONVERSATION_URL: `https://centrala.ag3nts.org/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`,
  QUESTIONS_URL: `https://centrala.ag3nts.org/${process.env.AI_DEVS_API_KEY}/phone_questions.json`,
  SYSTEM_PROMPT: `You are an investigative AI agent analyzing conversations and answering questions.
      Your task is to:
      1. Analyze conversations and identify characters
      2. Track statements and detect inconsistencies
      3. Answer questions based on available information
      4. Use API when required for specific answers`,
} as const;
