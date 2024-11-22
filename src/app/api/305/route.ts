import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";

const url = "https://centrala.ag3nts.org/apidb";

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `You are a detective trying to locate Barbara Zawadzka. Follow these steps carefully:

1. First, read Barbara's note from https://centrala.ag3nts.org/dane/barbara.txt
<note>
Podczas pobytu w Krakowie w 2019 roku, Barbara Zawadzka poznała swojego ówczesnego narzeczonego, a obecnie męża, Aleksandra Ragowskiego. Tam też poznali osobę prawdopodobnie powiązaną z ruchem oporu, której dane nie są nam znane. Istnieje podejrzenie, że już wtedy pracowali oni nad planami ograniczenia rozwoju sztucznej inteligencji, tłumacząc to względami bezpieczeństwa. Tajemniczy osobnik zajmował się także organizacją spotkań mających na celu podnoszenie wiedzy na temat wykorzystania sztucznej inteligencji przez programistów. Na spotkania te uczęszczała także Barbara.

W okolicach 2021 roku Rogowski udał się do Warszawy celem spotkania z profesorem Andrzejem Majem. Prawdopodobnie nie zabrał ze sobą żony, a cel ich spotkania nie jest do końca jasny.

Podczas pobytu w Warszawie, w instytucie profesora doszło do incydentu, w wyniku którego, jeden z laborantów - Rafał Bomba - zaginął. Niepotwierdzone źródła informacji podają jednak, że Rafał spędził około 2 lata, wynajmując pokój w pewnym hotelu. Dlaczego zniknął?  Przed kim się ukrywał? Z kim kontaktował się przez ten czas i dlaczego ujawnił się po tym czasie? Na te pytania nie znamy odpowiedzi, ale agenci starają się uzupełnić brakujące informacje.

Istnieje podejrzenie, że Rafał mógł być powiązany z ruchem oporu. Prawdopodobnie przekazał on notatki profesora Maja w ręce Ragowskiego, a ten po powrocie do Krakowa mógł przekazać je swojej żonie. Z tego powodu uwaga naszej jednostki skupia się na odnalezieniu Barbary.

Aktualne miejsce pobytu Barbary Zawadzkiej nie jest znane. Przypuszczamy jednak, że nie opuściła ona kraju.
</note>

2. Extract all person names and city names mentioned in the note

1. For each person name found:
   - Search the people  by making a getPeople request with {"query": "[PERSON_NAME]"}
   - Note any cities or additional persons mentioned in the results
2. For each city name found:
   - Search the places  by making a getPlaces request with {"query": "[CITY_NAME]"}
   - Note any persons mentioned in the results
3. Continue this process recursively with any new names or cities discovered
4. Search all people by name 
5. dont skip any name 
6. search all places by name
7. When you find current Barbara Zawadzka's location, return it in this format:
   \`\`\`json
   {"city": "[CITY_NAME]"}
   \`\`\`

Important:
- MOST IMPORTANT we are looking for CURRENT city where Barbara Zawadzka is NOW
- QUERY ONE WORD ONLY AT TIME
- QUERY ALWAYS USING CAPITAL LETTERS 
- QUERY ALWAYS WITHOUTH SPECIAL CHARACTERS 
- IT MAY NOT BE DIRECTLY SAID YOU MUST DEDUCE IT FROM THE CONTEXT
- Use simple name/city queries without any special characters
- Keep track of all connections between people and places
- Look for patterns that might reveal Barbara's location
- Put all the data together and fill in the missing information.
- Remember that some data might be incomplete or missing
- check FROMBORK and KONIN as well
- check person GLITCH - result of place KONIN search

Begin your investigation and report your findings step by step. For each step, explain your reasoning and what new information you've discovered.`;

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o"),
        maxSteps: 100,
        temperature: 1,
        prompt,
        onStepFinish: (step) => {
          console.log(step.text);
        },
        tools: {
          getPeople: {
            description: "Make an HTTP POST request to find people",
            parameters: z.object({
              query: z.string().describe(""),
            }),
            execute: async ({ query }) => {
              const response = await fetch(
                "https://centrala.ag3nts.org/people",
                {
                  method: "POST",
                  body: JSON.stringify({
                    apikey: AI_DEVS_API_KEY,
                    query,
                  }),
                }
              );

              const data = await response.json();

              console.log("getPeopleData", data);

              return data;
            },
          },
          getPlaces: {
            description: "Make an HTTP POST request to find places",
            parameters: z.object({
              query: z.string().describe(""),
            }),
            execute: async ({ query }) => {
              console.log("getPlaces", query);

              const response = await fetch(
                "https://centrala.ag3nts.org/places",
                {
                  method: "POST",
                  body: JSON.stringify({
                    apikey: AI_DEVS_API_KEY,
                    query,
                  }),
                }
              );

              const data = await response.json();

              console.log("getPlacesData", data);

              return data;
            },
          },
        },
      });

      const lastStep = steps[steps.length - 1].text;

      const match = lastStep.match(/```json\n(.*)\n```/s);

      console.log({ lastStep });

      if (match) {
        return JSON.parse(match[1]).city;
      }

      return lastStep;
    },
    catch: (e) => Effect.fail(e),
  });

const programDate = (date: string) =>
  pipe(
    askAgent(prompt),
    Effect.tap(Console.log),
    Effect.flatMap((data) => sendReport(data, "loop"))
  );

export async function GET() {
  return Effect.runPromise(
    // processDocuments(REPORTS_PATH)
    programDate("")
  ).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
