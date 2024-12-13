import { Effect, Schema as S, pipe } from "effect";
import { Sink } from "effect/Sink";

export class ResearchAgent<T extends any> {
  pipeline: Effect.Effect<T, Error, never>;

  constructor() {
    this.pipeline = Effect.succeed("") as any;
  }

  research(query: string) {
    this.pipeline = Effect.promise(async () => {
      const response = await fetch(
        `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`
      );

      const data = await response.json();

      return data;
    });

    return this as ResearchAgent<{ message: "sometign" }>;
  }

  print() {
    console.log("it kinda works");
    return this;
  }

  // schema<T>(schema: S.Schema<T>) {
  //   this.effect = pipe(
  //     this.effect,
  //     Effect.flatMap((data) => S.decode(schema)(data))
  //   );
  //   return this;
  // }
}

// Usage example

// Example usage
// const research = agent
//   .research("unique list of first names for babies")
//   .schema(S.array(S.string.pipe(S.description("first name for a baby"))))
//   .pipe(sinks.jsonFile("firstNames.json"));

// Execute
// research
//   .run()
//   .then(() => console.log("Research completed and saved"))
//   .catch(console.error);
