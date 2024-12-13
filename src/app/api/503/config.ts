export const CONFIG = {
  CONVERSATION_URL: `https://centrala.ag3nts.org/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`,
  QUESTIONS_URL: `https://centrala.ag3nts.org/${process.env.AI_DEVS_API_KEY}/phone_questions.json`,
  SYSTEM_PROMPT: `You are an investigative AI agent analyzing conversations and answering questions.
    Your task is to:
    1. Analyze conversations and identify characters
    2. Track statements and detect inconsistencies
    3. Answer questions based on available information
    4. Use API when required for specific answers`,
} as const;
