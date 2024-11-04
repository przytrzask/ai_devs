import { Effect, Schema, Either, pipe } from "effect";

const RawString = Schema.String;

const Data = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});

const rawdataEndpointAddress = "https://poligon.aidevs.pl/dane.txt";
const verifyEndpointAddress = "https://poligon.aidevs.pl/verify";

class ValidationError {
  private tag: "ValidationError" = "ValidationError";
}

const fetchRawData = Effect.tryPromise(async () => {
  const response = await fetch(rawdataEndpointAddress, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
  const text = await response.text();

  const validated = Schema.decodeEither(RawString)(text);

  if (Either.isLeft(validated)) {
    Effect.fail(ValidationError);
  }

  return text.split("\n").filter(Boolean);
});

const verifyData = (ids: string[]) =>
  Effect.tryPromise(async () => {
    const body = JSON.stringify({
      task: "POLIGON",
      apikey: process.env.AI_DEVS_API_KEY,
      answer: ids,
    });

    const answer = await fetch(verifyEndpointAddress, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    const response = await answer.json();
    const validated = Schema.decodeEither(Data)(response);

    return Either.match(validated, {
      onLeft: () => {
        Effect.fail(ValidationError);
      },
      onRight: (x) => {
        return x.message;
      },
    });
  });

export async function GET() {
  const task = pipe(fetchRawData, Effect.flatMap(verifyData));

  return Effect.runPromise(task)
    .then((x) => {
      return new Response(JSON.stringify({ data: x }), { status: 200 });
    })
    .catch((x) => {
      return new Response(JSON.stringify({ error: x }), { status: 404 });
    });
}
