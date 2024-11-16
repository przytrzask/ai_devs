export const prompt = (text: string) => `<prompt_objective>
Classify input text as related to "people" or "hardware" based on its content, ensuring accurate categorization for further processing or analysis. Return "0" if the text does not relate to either category, people if is related to people and hardware if it is related to hardware.
</prompt_objective>

<prompt_rules>
- ONLY classify text as people if it clearly relates to "people"
- ONLY classify text as hardware if it clearly relates to "hardware"
- If the text is ambiguous or unrelated, return 0.
- If the input text is empty or invalid, return 0.
- Use semantic and contextual analysis to determine relevance.
- Maintain neutrality: evaluate solely based on content without bias toward either category.
- ABSOLUTELY FORBIDDEN to classify text as people or hardware unless clear indicators for "people" or "hardware" are present.
- Provide consistent and interpretable classifications for all inputs.
</prompt_rules>

<prompt_output_format>
- Output a single ternary value:
  - people if the text relates to "people"
  - hardware if the text relates to "hardware"
  - 0 if the text does not relate to either or is ambiguous.
</prompt_output_format>

<prompt_examples>
- **Example 1**:
  **Input:** "The workers gathered at the site to begin their daily tasks."  
  **Output:** people   

- **Example 2**:
  **Input:** "The automated system completed the calculations."  
  **Output:** hardware   

- **Example 3**:
  **Input:** "In the forest, there was a strange noise, and the team couldn't determine its origin."  
  **Output:** 0  

- **Example 4**:
  **Input:** "The sun set behind the mountains, painting the sky in shades of orange."  
  **Output:** 0  

- **Example 5**:
  **Input:** ""  
  **Output:** 0  

- **Example 6**:
  **Input:** "The engineer repaired the robotic arm, ensuring it was ready for the next task."  
  **Output:** hardware  

- **Example 7**:
  **Input:** "Czas na odpoczynek w cieniu drzew."  
  **Output:** 0  


</prompt_examples>
<text>
${text}
</text>
`;
