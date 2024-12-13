import { CoreMessage, generateText } from "ai";
import { Effect } from "effect";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { eq, like, ilike } from "drizzle-orm";
import { documents } from "./schema";

import { db } from "./db";
import { constrainedMemory } from "process";

const systemPrompt = `
[AI Agent Analysis & GPS Tracking System]

You are an AI agent tasked with analyzing agent logs, tracking locations, and correlating user data. Follow these instructions precisely.

<prompt_objective>
Your purpose is to analyze malfunctioning agent logs, understand agent purposes, process location data, and correlate user information to answer headquarters' questions.
</prompt_objective>

<tools>
- getQuestions: fetches questions from headquarters
- getCharacterLocation: retrieves GPS coordinates
- getUserIdsByNames: retrieves user information including IDs by names
- sendReport: submits findings to headquarters
</tools>

<prompt_task>
1. Find out who was supposed to meet Rafał in Lubawa using getUsersByPlace tool. (query for Lubawa)
2. Retrieve users IDs for the people found in Lubawa, excluding Barbara. (tool getUserIdsByNames) passing the names found in step 1
3. Get GPS coordinates for the users who were supposed to meet Rafat in Lubava (tool getCharacterLocation)
4. collect data and  format data to 



{ answer: {
    "name": {
        "lat": 12.345,
        "lon": 65.431
    }
}

5  Report Submission using tool sendReport



Only return response when all data is collected and verified.
</prompt_task>
`;

const conversationSchema = z.object({
  rozmowa1: z.array(z.string()),
  rozmowa2: z.array(z.string()),
  rozmowa3: z.array(z.string()),
  rozmowa4: z.array(z.string()),
  rozmowa5: z.array(z.string()),
});

type ConversationReturnType = z.infer<typeof conversationSchema>;

export const sendReport = async ({ answer }: { answer: any }) => {
  console.log({ report: answer });

  const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;
  const reportUrl = "https://centrala.ag3nts.org/report";

  const body = JSON.stringify({
    task: "gps",
    apikey: AI_DEVS_API_KEY,
    answer,
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

  return characters.map((character) => character.title);
};

export const getConversations = async () => {
  const response = await fetch(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`
  );

  const data = await response.json();
  return data as ConversationReturnType;
};

const readLogs = async () => {
  const response = await fetch(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/gps.txt`
  );
  return await response.text();
};

const getQuestion = async () => {
  const response = await fetch(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/gps_question.json`
  );

  return await response.json();
};

const getCharacterLocation = async ({ userID }: { userID: number }) => {
  const response = await fetch("https://centrala.ag3nts.org/gps", {
    method: "POST",
    body: JSON.stringify({ userID }),
  });

  const data = await response.json();

  console.log({ characterLocation: data });

  return data;
};

const getUsersByPlace = async ({ place }: { place: string }) => {
  console.log({ place });

  const response = await fetch("https://centrala.ag3nts.org/places", {
    method: "POST",
    body: JSON.stringify({ query: place, apikey: process.env.AI_DEVS_API_KEY }),
  });

  const data = await response.json();

  console.log({ data: data.reply });

  return data;
};

const getUserIdsByNames = async ({ names }: { names?: string[] } = {}) => {
  console.log({ names });

  const query = names?.length
    ? `select * from users where username in (${names
        .map((name) => `'${name}'`)
        .join(",")})`
    : "select * from users limit 100";

  console.log({ query });

  const response = await fetch("https://centrala.ag3nts.org/apidb", {
    method: "POST",
    body: JSON.stringify({
      query,
      apikey: process.env.AI_DEVS_API_KEY,
      task: "database",
    }),
  });

  const data = await response.json();

  console.log({ data });

  return data;
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
  getUsersByPlace: {
    type: "function" as const,
    description: "get users by place",
    parameters: z.object({
      place: z.string(),
    }),
    returnType: z.string().describe("user names separated by space"),
    execute: getUsersByPlace,
  },
  getCharacterLocation: {
    type: "function" as const,
    description: "get character location",
    parameters: z.object({
      userID: z.number().describe("user id"),
    }),
    returnType: z.object({
      reply: z.object({
        code: z.number(),
        message: z.object({
          lat: z.number(),
          lon: z.number(),
        }),
      }),
    }),
    execute: getCharacterLocation,
  },
  getUserIdsByNames: {
    type: "function" as const,
    description: "Get information about users, optionally filtered by IDs",
    parameters: z.object({
      names: z.array(z.string()).describe("array of user names to filter by"),
    }),
    returnType: z.object({
      reply: z.array(
        z.object({
          id: z.string(),
          username: z.string(),
          access_level: z.string(),
          is_active: z.string(),
          lastlog: z.string(),
        })
      ),
    }),
    execute: getUserIdsByNames,
  },
  readLogs: {
    type: "function" as const,
    description: "read logs from the malfunctioning agent",
    parameters: z.object({}),
    returnType: z.string(),
    execute: readLogs,
  },

  getQuestion: {
    type: "function" as const,
    description: "get questions from headquarters",
    parameters: z.object({}),
    returnType: z.object({
      question: z.string(),
    }),
    execute: getQuestion,
  },

  sendReport: {
    type: "function" as const,
    description: "send report to headquarters",
    parameters: z.object({
      answer: z.record(
        z.string(),
        z.object({ lat: z.number(), lon: z.number() })
      ),
    }),
    execute: sendReport,
  },
};
