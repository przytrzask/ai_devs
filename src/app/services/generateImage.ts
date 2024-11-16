import {} from "ai";
import { Effect } from "effect";
import { HttpError } from "../types/errors";

export const generateImage = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
          }),
        }
      );

      if (!response.ok) {
        return Effect.fail(
          new HttpError(`API request failed: ${response.statusText}`)
        );
      }

      const data = await response.json();
      return data.data[0].url;
    },
    catch: (e) => {
      return new HttpError(e);
    },
  });
