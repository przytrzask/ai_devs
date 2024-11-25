import { Effect, Either } from "effect";
import { Schema } from "effect";
import { HttpError, ValidationError } from "../types/errors";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;
const reportUrl = "https://centrala.ag3nts.org/report";

const reportData = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});

export const sendReport = (data: any, task: string) =>
  Effect.tryPromise({
    try: async () => {
      console.log(data);

      const body = JSON.stringify({
        task,
        apikey: AI_DEVS_API_KEY,
        answer: data,
      });

      console.log({ body });

      const response = await fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        cache: "no-cache",
      });

      console.log({ response });

      const message = await response.json();

      console.log({ message });

      return message;
    },

    catch: (e) => {
      console.log({ e });
      return new HttpError(e);
    },
  });
