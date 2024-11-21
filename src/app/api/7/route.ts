import { Effect, pipe, Console, Schema, Either } from "effect";

import { askAi } from "../../services/askAI";
import { HttpError, ValidationError } from "../../types/errors";
import { generateImage } from "@/app/services/generateImage";
import { Data } from "@/app/api/302/schema/schema";

const API_KEY = process.env.AI_DEVS_API_KEY as string;

const reportUrl = "https://centrala.ag3nts.org/report";
const descriptionUrl = `https://centrala.ag3nts.org/data/${API_KEY}/robotid.json`;

const createPrompt = (prompt: string) => `[Generate Image Based on Description]

The AI’s primary task is to generate an image strictly according to the user’s description, following all specified details and restrictions.

<prompt_objective>
Generate an image based precisely on the user-provided description, adhering to all explicit instructions and constraints.
</prompt_objective>

<prompt_rules>
- ABSOLUTELY FORBIDDEN to include any text in the image
- Always create the image in **PNG format** with **1024×1024 px** dimensions.
- Follow all user-provided details without adding or omitting elements.
- ABSOLUTELY FORBIDDEN to include any object or element explicitly excluded by the user (e.g., if instructed “do not include an elephant,” ensure no elephant appears).
- In cases of contradictory instructions or updates, PRIORITIZE the latest instruction.
- When encountering ambiguous or imaginative language, interpret creatively but remain faithful to the description without deviating or assuming additional context.
- If user input lacks essential details, default to a **neutral, realistic** style unless another style is specified.

<examples>
1. **Typical Example:** "A robot walking on multiple legs like a spider, but without an abdomen, just a rotating camera." 
   - Generate a spider-like robot with multiple legs and a rotating camera instead of an abdomen, adhering to realism.

2. **Edge Case (Prohibited Element):** "A landscape with a mountain and lake, but do not include any animals."
   - Generate only the landscape with mountains and lake, strictly avoiding any animals.

3. **Contradictory Instructions:** Initial input: "Create a jungle scene with birds." Update: "Do not include birds."
   - Exclude birds as per the latest instruction.

4. **Ambiguous Language:** "A futuristic city that feels ancient."
   - Interpret creatively, blending futuristic architecture with ancient design elements.

5. **Incomplete Detail:** "A forest with a glowing entity."
   - Default to a neutral, realistic style for the forest with a faintly glowing, indistinct shape.

</examples>

<conflict_resolution>
- When input conflicts arise, proceed based on the **latest user instruction**.
</conflict_resolution>
<user_prompt>
${prompt}
</user_prompt>
`;

const descriptionSchema = Schema.Struct({
  description: Schema.String,
});

const getDescription = Effect.tryPromise({
  try: async () => {
    const response = await fetch(descriptionUrl, { cache: "no-cache" });
    const description = await response.json();

    console.log({ description });

    const validated = Schema.decodeEither(descriptionSchema)(description);

    if (Either.isLeft(validated)) {
      throw new ValidationError();
    }
    return validated.right.description;
  },

  catch: (e) => {
    return new HttpError(e);
  },
});

const sendReport = (data: string) =>
  Effect.tryPromise({
    try: async () => {
      console.log({ data });

      const body = JSON.stringify({
        task: "robotid",
        apikey: API_KEY,
        answer: data,
      });

      const response = await fetch(reportUrl, {
        method: "POST",
        body,
        cache: "no-cache",
      });

      const message = await response.json();

      const validated = Schema.decodeEither(Data)(message);

      if (Either.isLeft(validated)) {
        throw new ValidationError();
      }

      return Effect.succeed(validated.right);
    },

    catch: (e) => {
      console.log(e);
      return new HttpError(e);
    },
  });

const program = pipe(
  getDescription,
  Effect.andThen((desc) => createPrompt(desc)),
  Effect.andThen(generateImage),
  Effect.flatMap(sendReport),
  Effect.catchTags({
    HttpError: (e) => {
      return Effect.succeed({
        status: 500,
        data: e,
      });
    },
  })
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    if (Schema.decodeEither(Data)(data))
      if ("message" in data) {
        return new Response(JSON.stringify({ data: data.message }), {
          status: 200,
        });
      } else {
        return new Response(JSON.stringify({ data }), { status: data.status });
      }
  });
}
