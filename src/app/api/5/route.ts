import { Effect, pipe } from "effect";

import { askAi } from "../../services/askAI";
import { HttpError } from "../../types/errors";

const getRemoteFileAddress = (apiKey: string) =>
  `https://centrala.ag3nts.org/data/${apiKey}/cenzura.txt`;

const API_KEY = process.env.AI_DEVS_API_KEY as string;

const reportUrl = "https://centrala.ag3nts.org/report";
// const reportUrl = "https://purring-traffic-74.webhook.cool";

const createPrompt = (question: string) => `
<prompt_objective> The AI’s task is to detect and replace any sensitive data (name + surname, street name + number, city, and age) with the word "CENZURA," without altering any punctuation, spaces, or formatting in the input text. </prompt_objective>

<prompt_rules>

The AI must locate and censor specific sensitive information: name + surname, street name + number, city, and age.
ABSOLUTELY FORBIDDEN to edit or alter any punctuation, spaces, or formatting within the text.
The AI is ONLY permitted to replace specified sensitive data with "CENZURA"—nothing else may be modified.
UNDER NO CIRCUMSTANCES should the AI interpret, summarize, or modify content outside of censoring the specified sensitive data.
The output should strictly mirror the input formatting, with only the identified sensitive data replaced by "CENZURA." </prompt_rules>
<prompt_examples> USER: John Doe lives in New York at 123 Maple St. He is 29 years old. AI: CENZURA lives in CENZURA at CENZURA. He is CENZURA years old.

USER: Jane Doe, age: 34, resides at 45 Oak Avenue, Springfield. AI: CENZURA, age: CENZURA, resides at CENZURA, CENZURA.

USER: Resident: Mike O'Neill, lives at 50 Elm St. (Apt. 5), Chicago. AI: Resident: CENZURA, lives at CENZURA, CENZURA.

USER: Tommy Doe lives at T. Doe Street in Brooklyn, 32 years. AI: CENZURA lives at CENZURA in CENZURA, CENZURA. </prompt_examples>

Final Confirmation: Apply these rules precisely, ensuring strict adherence to the instructions and examples provided.
 <question_content>
      ${question}
  </question_content>
`;

const getFileContent = () =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(getRemoteFileAddress(API_KEY), {
        method: "GET",
        cache: "no-cache",
      });
      const text = await response.text();
      return text;
    },
    catch: () => {
      return new HttpError();
    },
  });

const sendReport = (data: string) =>
  Effect.tryPromise({
    try: async () => {
      const body = JSON.stringify({
        task: "CENZURA",
        apikey: API_KEY,
        answer: data,
      });

      const response = await fetch(reportUrl, {
        method: "POST",
        body,
      });
      const answer = await response.json();

      return answer;
    },

    catch: (e) => {
      console.log(e);
      return new HttpError(e);
    },
  });

const program = pipe(
  getFileContent(),
  Effect.andThen((fileContent) => askAi(createPrompt(fileContent))),
  Effect.andThen(sendReport),
  Effect.catchTags({
    HttpError: (e: HttpError) => {
      console.log({ e });
      return Effect.succeed({
        status: 500,
        data: e,
      });
    },
  })
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    if (typeof data === "string") {
      return new Response(JSON.stringify({ data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  });
}
