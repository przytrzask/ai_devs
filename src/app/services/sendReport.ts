import { Effect, Either } from "effect";
import { Schema } from "effect";
import { HttpError, ValidationError } from "../types/errors";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;
const reportUrl = "https://centrala.ag3nts.org/report";

const reportData = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});

console.log({ AI_DEVS_API_KEY, reportUrl });

export const sendReport = (data: any, task: string) =>
  Effect.tryPromise({
    try: async () => {
      console.log({ data, task });

      const parsed = JSON.parse(data);

      console.log({ parsed });

      console.log(typeof parsed);

      const body = JSON.stringify({
        task,
        apikey: AI_DEVS_API_KEY,
        answer: parsed,
      });

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
