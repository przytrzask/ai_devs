import { Effect } from "effect";
import { z } from "zod";

import { openai } from "@ai-sdk/openai";

import { generateText } from "ai";

import FirecrawlApp from "@mendable/firecrawl-js";

const siteUrl = "https://xyz.ag3nts.org/";

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const createPrompt = (question: string) =>
  `<instructions>answer the  question  <question_content>
      ${question}
    </question_content>  If there is no question, return "1945"
    return only answer to question. Return only number. Do not return any other text.
</p></instructions>    
`;

type UserFormData = {
  username: string;
  password: string;
};

const schema = z.object({
  question: z.string(),
});

const sendFormEffect = ({ username, password }: UserFormData) => {
  return Effect.tryPromise(async () => {
    const crawlResponse = await app.scrapeUrl(siteUrl, {
      formats: ["extract"],
      extract: { schema: schema },
    });

    if (!crawlResponse.success) {
      return "1945";
    }

    const {
      extract: { question },
    } = crawlResponse;

    const result = await generateText({
      model: openai("gpt-4-turbo"),
      messages: [
        {
          role: "user",
          content: createPrompt(question),
        },
      ],
    });

    const answer = result.response.messages[0].content[0] as string;

    const formData = new URLSearchParams({
      username: username,
      password: password,
      answer: answer.text,
    });

    const formSubmitResponse = await fetch(siteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const res = await formSubmitResponse.text();

    console.log({
      res,
    });

    return res;
  });
};

export async function GET() {
  const task = sendFormEffect({
    username: "tester",
    password: "574e112a",
  });

  return Effect.runPromise(task)
    .then((x) => {
      return new Response(JSON.stringify({ data: x }), { status: 200 });
    })
    .catch((x) => {
      console.log(x);
      return new Response(JSON.stringify({ error: x }), { status: 404 });
    });
}
