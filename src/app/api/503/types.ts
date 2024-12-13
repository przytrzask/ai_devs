// First, let's define our state properly

import { Effect } from "effect";

type Message = {
  id: string;
  content: string;
};

type Character = {
  name: string;
  description: string;
};

type Question = {
  id: string;
  content: string;
};

type AgentTools = {
  [key: string]: (state: AgentState) => Effect.Effect<AgentState, never>;
};

export type AgentState = {
  messages: Message[];
  characters: Map<string, Character>;
  questions: Question[];
  currentStep: string;
  memory: {
    conversationHistory: Message[];
    characterObservations: Map<string, string[]>;
    factChecks: Map<string, boolean>;
  };
  tools: AgentTools;
  config: {
    maxTokens: number;
    temperature: number;
    streamResponse: boolean;
  };
};

// State reducer for messages
export const messagesStateReducer = (current: Message[], next: Message[]) => {
  return [...current, ...next].filter(
    (message, index, self) =>
      index === self.findIndex((m) => m.id === message.id)
  );
};
