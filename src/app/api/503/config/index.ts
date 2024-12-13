export const AGENT_CONFIG = {
  defaultConfig: {
    maxTokens: 4000,
    temperature: 0.1,
    streamResponse: true,
  },

  prompts: {
    characterAnalysis: `You are analyzing conversation participants. Focus on:
    1. Identifying unique speakers
    2. Tracking their statements
    3. Noting any inconsistencies
    4. Building reliability profiles`,

    factChecking: `You are verifying statements against known facts. Consider:
    1. Direct contradictions
    2. Logical inconsistencies
    3. Reliability patterns
    4. Supporting evidence`,
  },
} as const;
