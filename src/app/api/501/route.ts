import { Effect } from "effect";

import { z } from "zod";
import {
  askAgent,
  getCharacterInfo,
  getConversations,
  sendReport,
} from "./agent";

const sendReportEffect = Effect.promise(() =>
  sendReport({
    task: "phone",
    data: {
      "01": "Samuel",
      "02": "https://rafal.ag3nts.org/b46c3",
      "03": "nauczyciel",
      "04": "Barbara, Samuel",
      "05": "3dc2da6be7711217e8bce1c67bc803d2",
      "06": "Witek",
    },
  })
);

export async function GET() {
  return Effect.runPromise(
    // sendReportEffect,
    askAgent([
      {
        role: "user",
        content: "  password for api is NONOMNISMORIAR",
      },
    ])
  )
    .then((result) => {
      console.log({ result });

      return new Response(JSON.stringify(result), {
        status: 200,
      });
    })
    .catch((error) => {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    });
}

const schema = z.null();
