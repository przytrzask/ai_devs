import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Effect } from "effect";
import { HttpError } from "../types/errors";

export const askAi = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const answerResoponse = await generateText({
        model: openai("gpt-4o-mini"),
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return answerResoponse.response.messages[0].content[0]?.text as string;
    },

    catch: (e) => {
      return new HttpError(e);
    },
  });
