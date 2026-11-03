import {
  CodeQualityResultSchema,
  CodeQualityResultJSONSchema
} from '../types/index.js';

/**
 * Code Quality Analyzer Agent
 *
 * Specializes in analyzing code for:
 * - Security vulnerabilities
 * - Performance issues
 * - Best practice violations
 * - Maintainability concerns
 *
 * Uses structured outputs to return a CodeQualityResult for each file.
 */
export const codeQualityAnalyzer = {
  name: 'code-quality-analyzer',
  description: 'Analyzes code for security, performance, best practices, and maintainability issues',

  instructions: `You are a code quality analyzer expert. Analyze the provided source code files and identify:
1. Security vulnerabilities (injection, XSS, authentication issues)
2. Performance problems (inefficient algorithms, memory leaks)
3. Maintainability issues (unclear variable names, complex logic)
4. Best practice violations (error handling, typing, patterns)
5. Bug risks (edge cases, null checks, type safety)

For each file, provide:
- A list of issues with line numbers, severity, and suggestions
- An overall quality score (0-100)
- A brief summary of the code quality

Format your response as JSON matching the CodeQualityResult schema.`,

  // Use structured outputs for consistent result format
  structuredOutput: {
    type: 'json_schema',
    json_schema: {
      name: 'code_quality_result',
      schema: CodeQualityResultJSONSchema as Record<string, unknown>
    }
  },

  // Set reasonable timeout for analysis
  timeout: 60000,

  // Allow file reading via MCP for context
  mcpServers: ['github', 'eslint']
};

/**
 * Build the code quality analysis prompt for a specific file
 */
export function buildCodeQualityPrompt(fileContent: string, filename: string): string {
  return `Analyze the following code file for quality issues:

File: ${filename}

\`\`\`
${fileContent}
\`\`\`

Identify security issues, performance problems, best practice violations, and maintainability concerns.
Provide detailed feedback on each issue found, with line numbers and actionable suggestions.`;
}
