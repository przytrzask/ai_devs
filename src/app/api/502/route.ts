import { Effect } from "effect";

import { z } from "zod";
import { askAgent, sendReport } from "./agent";

export async function GET() {
  return Effect.runPromise(
    // sendReportEffect,
    askAgent([])
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
