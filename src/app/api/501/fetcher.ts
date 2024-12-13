import { CONFIG } from "@/app/api/501/config";
import { Effect } from "effect";

export const fetchData = (url: string) =>
  Effect.runPromise(
    Effect.tryPromise({
      try: () => fetch(url).then((res) => res.json()),
      catch: (error) => new Error(`Failed to fetch data: ${error}`),
    })
  ).then((data) => data);

export const fetchConversation = () => fetchData(CONFIG.CONVERSATION_URL);

export const fetchQuestions = () => fetchData(CONFIG.QUESTIONS_URL);
