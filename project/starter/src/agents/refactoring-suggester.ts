import {
  RefactoringSuggestionSchema,
  RefactoringSuggestionJSONSchema
} from '../types/index.js';

/**
 * Refactoring Suggester Agent
 *
 * Specializes in identifying modernization and pattern improvement opportunities:
 * - Extract functions and classes
 * - Rename variables for clarity
 * - Modernize to newer language features
 * - Simplify complex logic
 * - Apply design patterns
 *
 * Provides before/after code examples for each suggestion.
 */
export const refactoringSuggester = {
  name: 'refactoring-suggester',
  description: 'Suggests code refactoring opportunities for modernization and pattern improvements',

  instructions: `You are a code refactoring expert. Analyze the provided source code files and suggest:
1. Functions that should be extracted to improve readability
2. Variables that need better naming for clarity
3. Opportunities to use modern language features and APIs
4. Complex logic that can be simplified
5. Design pattern improvements (DRY, SRP, composition)

For each file, provide:
- A list of refactoring suggestions
- Each suggestion should include:
  - Type of refactoring (extract-function, rename, modernize, simplify, pattern-improvement)
  - Location in the code
  - Impact level (low, medium, high)
  - Clear description of the change
  - Before code snippet
  - After code snippet
  - Benefits of the refactoring
- A summary of recommended changes

Format your response as JSON matching the RefactoringSuggestion schema.`,

  // Use structured outputs for consistent result format
  structuredOutput: {
    type: 'json_schema',
    json_schema: {
      name: 'refactoring_suggestion',
      schema: RefactoringSuggestionJSONSchema as Record<string, unknown>
    }
  },

  // Set reasonable timeout for analysis
  timeout: 60000,

  // Allow file reading via MCP for context
  mcpServers: ['github', 'eslint']
};

/**
 * Build the refactoring analysis prompt for a specific file
 */
export function buildRefactoringPrompt(fileContent: string, filename: string): string {
  return `Suggest refactoring improvements for the following code file:

File: ${filename}

\`\`\`
${fileContent}
\`\`\`

Suggest improvements for:
1. Code clarity and readability
2. Modern language features and patterns
3. Function/class extraction
4. Variable and function naming
5. Logic simplification
6. Design pattern applications

For each suggestion, provide:
- Clear before/after code examples
- Explanation of why the change improves the code
- Estimated impact (low/medium/high)`;
}
