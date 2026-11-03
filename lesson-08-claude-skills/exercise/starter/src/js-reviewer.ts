/**
 * JavaScript Code Reviewer Agent
 *
 * Exercise: Implement reviewJavaScriptFile() using Claude Agent SDK
 * with the js-code-review skill loaded from .claude/skills/
 *
 * Combines Skills (L08) with Structured Outputs (L07) for type-safe results.
 */

import "dotenv/config";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const model = process.env.ANTHROPIC_MODEL;
if (!model) {
  throw new Error("ANTHROPIC_MODEL is not set");
}

// Project root where .claude/skills/ is located
const PROJECT_ROOT = path.resolve(__dirname, "..");

// -----------------------------------------------------------------------------
// TODO 1: Define Zod Schemas for Structured Output
// -----------------------------------------------------------------------------

// TODO: Define CodeIssueSchema with these fields:
// - line: number (line number where issue was found)
// - severity: enum ["error", "warning", "info"]
// - category: enum ["quality", "bug", "security", "performance", "style"]
// - message: string (description of the issue)
// - suggestion: string (suggested fix)
const CodeIssueSchema = z.object({
  line: z.number().describe("Line number where issue was found"),
  severity: z.enum(["error", "warning", "info"]).describe("Severity level of the issue"),
  category: z.enum(["quality", "bug", "security", "performance", "style"]).describe("Category of the issue"),
  message: z.string().describe("Description of the issue"),
  suggestion: z.string().describe("Suggested fix for the issue"),
});

// TODO: Define CodeReviewResultSchema with these fields:
// - filename: string (name of reviewed file)
// - summary: string (brief summary of code review)
// - issues: array of CodeIssueSchema
// - score: number (quality score 0-100)
// - recommendations: array of strings
const CodeReviewResultSchema = z.object({
  filename: z.string().describe("Name of the reviewed file"),
  summary: z.string().describe("Brief summary of the code review"),
  issues: z.array(CodeIssueSchema).describe("List of issues found in the code"),
  score: z.number().min(0).max(100).describe("Quality score from 0-100"),
  recommendations: z.array(z.string()).describe("Recommendations for improvement"),
});

export type CodeIssue = z.infer<typeof CodeIssueSchema>;
export type CodeReviewResult = z.infer<typeof CodeReviewResultSchema>;

// -----------------------------------------------------------------------------
// TODO 2: Convert Zod schema to JSON Schema
// -----------------------------------------------------------------------------

// Hint: Use zodToJsonSchema(CodeReviewResultSchema, { $refStrategy: "root" })
// The $refStrategy: "root" option properly inlines all $ref definitions
type JsonSchema = Record<string, unknown>;
const toJsonSchema = (schema: z.ZodTypeAny): JsonSchema =>
  zodToJsonSchema(schema, { $refStrategy: "root" }) as JsonSchema;

const CodeReviewJSONSchema = toJsonSchema(CodeReviewResultSchema);

// -----------------------------------------------------------------------------
// TODO 3: Create the Review Prompt
// -----------------------------------------------------------------------------

// TODO: Create a prompt that instructs Claude to:
// 1. Read the JavaScript file at the given path
// 2. Use the js-code-review skill to analyze the code
// 3. Return structured results matching the schema
const reviewPrompt = (filePath: string) => `
You are a JavaScript code reviewer. Your task is to analyze the provided JavaScript file and provide a comprehensive code review.

1. Read the JavaScript file at: ${filePath}
2. Use the js-code-review skill to thoroughly analyze the code
3. Look for:
   - Code quality issues (var usage, unused variables, console statements, magic numbers)
   - Potential bugs (loose equality, missing error handling, null/undefined access)
   - Security vulnerabilities (eval, innerHTML, hardcoded secrets)
   - Performance issues
   - Style and maintainability problems

4. Return a structured JSON review with:
   - filename: The name of the file being reviewed
   - summary: A brief summary of the overall code quality
   - issues: Array of issues found, each with line number, severity (error/warning/info), category, message, and suggestion
   - score: A quality score from 0-100
   - recommendations: Top priority improvements and best practices to follow

Analyze thoroughly and provide constructive feedback.
`;

// -----------------------------------------------------------------------------
// TODO 4: Implement reviewJavaScriptFile()
// -----------------------------------------------------------------------------

export async function reviewJavaScriptFile(
  filePath: string
): Promise<CodeReviewResult> {

  for await (const message of query({
    prompt: reviewPrompt(filePath),
    options: {
      cwd: PROJECT_ROOT,
      settingSources: ["project"],
      model,
      allowedTools: ["Skill", "Read", "Grep", "Glob"],
      outputFormat: {
        type: "json_schema",
        schema: CodeReviewJSONSchema,
      },
    },
  })) {
    // Handle structured output response
    if (message.type === "result" && message.subtype === "success") {
      if (message.structured_output) {
        const parsed = CodeReviewResultSchema.safeParse(message.structured_output);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  }

  throw new Error("Failed to get structured output from agent");
}
