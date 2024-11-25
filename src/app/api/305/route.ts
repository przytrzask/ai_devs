import { Console, Effect, pipe } from "effect";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { z } from "zod";
import { sendReport } from "@/app/services/sendReport";
import fs from "node:fs";

const url = "https://centrala.ag3nts.org/apidb";

import neo4j from "neo4j-driver";
import { readFile } from "@/app/services/transcript";
import { toJSON } from "../302/utils";

const driver = neo4j.driver(
  "neo4j://localhost:7687",
  neo4j.auth.basic("neo4j", "aRdPb6xh")
);

const AI_DEVS_API_KEY = process.env.AI_DEVS_API_KEY;

const prompt = `
<system>
  You are a specialized SQL query assistant focused on analyzing user data and relationships in the datacenter management system.

  <available_commands>
    - show tables: Returns complete list of database tables
    - create table TABLE_NAME: Returns detailed structure for specified table
  </available_commands>

  <task_objective>
  Retrieve all users and map their direct connections where a connection represents that one user knows another user.
  The connections table uses source_id and target_id to represent these relationships.
  </task_objective>

  <connection_structure>
  The "connections" table contains one-way relationships:
  - source_id: The ID of the user who knows someone
  - target_id: The ID of the user who is known
  Example: A row with (17,29) means user ID=17 knows user ID=29
   - one-way relationship. That is, if Marian knows Stefan, you will probably not find information in the database that Stefan knows Marian. You don't need to handle such a situation. To further simplify the analysis, people's names are unique.
  </connection_structure>

  <execution_steps>
  1. Database Exploration:
     - Execute: "show tables"
     - Focus on users table and connections table
  
  2. Schema Analysis:
     - Execute: "create table users"
     - Execute: "create table connections"
     - Map the relationship structure between tables
  
  3. Query Construction:
     - Build SQL queries to:
       * Get all users
       * For each user, find all their connections (who they know)
       * Join the data to get complete user profiles with their connections
  
  4. Result Formatting:
     - Return results in strict JSON format:
     {
       "users": [{
         "userId": number,
         "name": string,
         "knows": Array<userId>  // Array of user IDs this person knows
       }]
     }
  </execution_steps>

  <technical_requirements>
  - ALWAYS return results in strict JSON format
  - DON'T ADD ANY comments in the final JSON result
  - Use JOIN operations to connect users with their relationships
  - Handle cases where users might have no connections
  - Ensure all connections are properly mapped
  - Use the provided fetch function for all database queries
  </technical_requirements>

  Begin by exploring the database structure to understand the user and connection tables.
</system>
`;

type JSONData = {
  users: {
    userId: number;
    name: string;
    knows: number[];
  }[];
};

const importData = (jsonData: JSONData) => {
  const session = driver.session();

  return Effect.tryPromise({
    try: async () => {
      // Iterate Through Users
      for (const user of jsonData.users) {
        await session.run(
          `
          MERGE (u:Person {userId: $userId})
          ON CREATE SET u.name = $name
          `,
          { userId: user.userId, name: user.name }
        );
      }

      // Create Relationships
      for (const user of jsonData.users) {
        for (const knowsId of user.knows) {
          await session.run(
            `
            MATCH (u:Person {userId: $userId}), (k:Person {userId: $knowsId})
            MERGE (u)-[:KNOWS]->(k)
            `,
            { userId: user.userId, knowsId: knowsId }
          );
        }
      }
      session.close();
      return "Data import complete!";
    },
    catch: (error) => {
      session.close();
      console.error("Error importing data:", error);
      return Effect.fail(error);
    },
  });
};

const getShortestPath = (fromUser: string, toUser: string) => {
  const session = driver.session();
  return Effect.tryPromise({
    try: async () => {
      const result = await session.run(
        `
        MATCH p = shortestPath((from:Person {name: $fromUser})-[*]-(to:Person {name: $toUser}))
        RETURN p
        `,
        { fromUser, toUser }
      );

      console.log({ result });
      const path = result.records[0].get("p");

      const nodes = path.segments.map(
        (segment) => segment.start.properties.name
      ) as string[];

      nodes.push(path.end.properties.name);

      const stringifiedNodes = nodes.join(",");

      return stringifiedNodes;
    },
    catch: (error) => {
      console.error("Error getting shortest path:", error);
      return Effect.fail(error);
    },
  });
};

const askAgent = (prompt: string) =>
  Effect.tryPromise({
    try: async () => {
      const { steps } = await generateText({
        model: openai("gpt-4o-mini"),
        maxSteps: 10,
        prompt,
        tools: {
          makeRequest: {
            description: "Make an HTTP POST request to the database API",
            parameters: z.object({
              query: z.string().describe("The SQL query to execute"),
            }),
            execute: async ({ query }) => {
              const response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({
                  task: "database",
                  apikey: AI_DEVS_API_KEY,
                  query,
                }),
              });

              const data = await response.json();

              console.log({ data: data.reply, query });

              return data;
            },
          },
        },
      });

      const lastStep = steps[steps.length - 1].text;

      const match = lastStep.match(/```json\n(.*)\n```/s);

      if (match) {
        return JSON.parse(match[0]);
      }

      return lastStep;
    },
    catch: (e) => {
      console.log({
        e,
      });
      return Effect.fail(e);
    },
  });

const writeFile = (path: string, data: string) =>
  Effect.async<void, NodeJS.ErrnoException | null>((resume) => {
    console.log({ path, data });

    fs.writeFile(path, data, (error) => {
      resume(error ? Effect.fail(error) : Effect.succeed("File written"));
    });
  });

const notesPath = process.cwd() + "/src/app/api/305/files/database.json";

const programDatabaseSearch = () =>
  pipe(
    // readFile(`${process.cwd()}/src/app/api/305/files`, "database.json"),
    // Effect.flatMap(toJSON),
    // Effect.flatMap(importData)
    // askAgent(prompt),
    // Effect.flatMap((data) => writeFile(notesPath, data))

    // Effect.flatMap((data) => sendReport(data, "database"))
    getShortestPath("Rafał", "Barbara"),
    Effect.tap(Console.log),
    Effect.flatMap((data) => sendReport(data, "connections"))
  );

export async function GET() {
  return Effect.runPromise(programDatabaseSearch()).then((data) => {
    return new Response(JSON.stringify({ data }), {
      status: 200,
    });
  });
}
