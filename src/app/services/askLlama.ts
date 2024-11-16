import { Effect } from "effect";
import { HttpError } from "../types/errors";

const LLAMA_URL = "http://localhost:11434/api/generate";

export const askLlama = (question: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        LLAMA_URL,

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama2:7b",
            prompt: question,
            stream: false,
          }),
        }
      );

      const json = await response.json();

      console.log({ json });

      return json.data.response as string;
    },
    catch: (e) => {
      console.log({
        askLlamaError: e,
      });
      return new HttpError(e);
    },
  });
