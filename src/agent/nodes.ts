import { Effect } from "effect";
import { getDocument } from "@/app/api/501/utils";

export const dataLoader = (state: AgentState) =>
  Effect.gen(function* (_) {
    const conversation = yield* _(fetchConversation());
    const questions = yield* _(fetchQuestions());

    return {
      ...state,
      messages: conversation,
      questions,
      currentStep: "characterAnalysis",
    };
  });

export const characterAnalyzer = (state: AgentState) =>
  Effect.gen(function* (_) {
    const characters = new Map<string, Character>();

    // Analyze each message to identify characters and their statements
    for (const message of state.messages) {
      // Get relevant facts about the speaker
      const facts = yield* Effect.tryPromise(() =>
        getDocument(message.content)
      );

      // Extract character info from facts and message
      const characterName = message.metadata?.speaker || "unknown";
      const currentChar = characters.get(characterName) || {
        name: characterName,
        mentions: [],
        statements: [],
        reliability: 1.0,
      };

      // Update character info with facts
      currentChar.statements.push(message.content);
      facts.forEach((fact) => {
        if (fact.similarity > 0.8) {
          // High confidence threshold
          currentChar.mentions.push(fact.description);
        }
      });

      characters.set(characterName, currentChar);
    }

    return {
      ...state,
      characters,
      currentStep: "factChecking",
    };
  });

export const factChecker = (state: AgentState) =>
  Effect.gen(function* (_) {
    // For each character, check their statements against known facts
    for (const [name, character] of state.characters.entries()) {
      let reliability = 1.0;

      for (const statement of character.statements) {
        const facts = yield* _(Effect.tryPromise(() => getDocument(statement)));

        // Check for contradictions in facts
        facts.forEach((fact) => {
          if (fact.similarity > 0.8) {
            // If statement contradicts known facts, reduce reliability
            if (fact.title.includes("contradiction")) {
              reliability *= 0.8;
            }
          }
        });
      }

      // Update character reliability
      character.reliability = reliability;
      state.characters.set(name, character);
    }

    return {
      ...state,
      currentStep: "questionAnswering",
    };
  });

export const questionAnswerer = (state: AgentState) =>
  Effect.gen(function* (_) {
    // Question answering logic will go here
    return {
      ...state,
      currentStep: "complete",
    };
  });
