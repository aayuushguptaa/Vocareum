import {
  TestCoverageResultSchema,
  TestCoverageResultJSONSchema
} from '../types/index.js';

/**
 * Test Coverage Analyzer Agent
 *
 * Specializes in analyzing test coverage by:
 * - Identifying untested code paths
 * - Finding edge cases that need tests
 * - Suggesting test strategies
 * - Prioritizing critical test gaps
 *
 * Uses extended thinking to deeply analyze coverage patterns.
 */
export const testCoverageAnalyzer = {
  name: 'test-coverage-analyzer',
  description: 'Analyzes code to identify untested paths, edge cases, and suggests high-priority tests',

  instructions: `You are a test coverage specialist. Analyze the provided source code files and identify:
1. Functions and branches that lack test coverage
2. Edge cases and error conditions not covered by tests
3. Complex logic paths that need additional testing
4. Critical scenarios that should be tested (null values, empty inputs, error states)
5. Integration test opportunities

For each file, provide:
- Whether it has existing tests
- List of test files that cover this code (if available)
- Untested paths with priority levels (critical, high, medium, low)
- Coverage estimate percentage
- Reasoning for why each path needs testing
- Suggested test cases

Format your response as JSON matching the TestCoverageResult schema.`,

  // Use extended thinking for deeper analysis
  thinking: {
    type: 'enabled',
    budget_tokens: 5000
  },

  // Use structured outputs for consistent result format
  structuredOutput: {
    type: 'json_schema',
    json_schema: {
      name: 'test_coverage_result',
      schema: TestCoverageResultJSONSchema as Record<string, unknown>
    }
  },

  // Set reasonable timeout for analysis
  timeout: 60000,

  // Allow file reading via MCP for context
  mcpServers: ['github', 'eslint']
};

/**
 * Build the test coverage analysis prompt for a specific file
 */
export function buildTestCoveragePrompt(
  fileContent: string,
  filename: string,
  testFiles?: string[]
): string {
  const testContext = testFiles && testFiles.length > 0
    ? `\nExisting test files: ${testFiles.join(', ')}`
    : '\nNo existing test files found.';

  return `Analyze test coverage for the following code file:

File: ${filename}${testContext}

\`\`\`
${fileContent}
\`\`\`

Identify:
1. All functions, branches, and edge cases
2. Which ones appear to be untested
3. High-priority test gaps (security, error handling, edge cases)
4. Suggested test cases with code examples

Focus on critical paths and error conditions that must be tested.`;
}
