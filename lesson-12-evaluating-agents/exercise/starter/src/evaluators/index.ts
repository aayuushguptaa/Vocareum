/**
 * Sentiment Agent Evaluators
 *
 * TODO: Implement three evaluators to assess agent performance:
 * 1. Tool Call Evaluator - Did the agent call the correct tool?
 * 2. Schema Validity Evaluator - Is the output valid against the Zod schema?
 * 3. Accuracy Evaluator - Does the sentiment match the expected value?
 */

import { SentimentAnalysisSchema, type SentimentAnalysis, type SentimentTestCase } from "../types.js";
import type { AgentTrace } from "../sentiment-agent.js";

// -----------------------------------------------------------------------------
// Evaluator Result Types
// -----------------------------------------------------------------------------

export interface EvaluatorResult {
  name: string;
  passed: boolean;
  score: number; // 0 to 1
  details: string;
}

export interface EvaluationReport {
  testCase: SentimentTestCase;
  evaluators: EvaluatorResult[];
  overallPassed: boolean;
  overallScore: number;
}

// -----------------------------------------------------------------------------
// TODO: Evaluator 1 - Tool Call Evaluator
// Checks if the agent called the sentiment analysis tool correctly
// -----------------------------------------------------------------------------

export function evaluateToolCall(trace: AgentTrace): EvaluatorResult {
  const expectedTool = "mcp__sentiment-analyzer__analyze_sentiment";
  const toolCalls = trace.toolCalls;

  // Step 1 - Check if any tool was called
  if (toolCalls.length === 0) {
    return {
      name: "Tool Call Evaluator",
      passed: false,
      score: 0,
      details: "No tools were called by the agent",
    };
  }

  // Step 2 - Check if the correct tool was called
  const correctToolCall = toolCalls.find((call) => call.name === expectedTool);
  if (!correctToolCall) {
    const actualTools = toolCalls.map((call) => call.name).join(", ");
    return {
      name: "Tool Call Evaluator",
      passed: false,
      score: 0.25,
      details: `Expected tool '${expectedTool}' but agent called: ${actualTools}`,
    };
  }

  // Step 3 - Check if text parameter was provided
  if (!correctToolCall.input.text) {
    return {
      name: "Tool Call Evaluator",
      passed: false,
      score: 0.5,
      details: "Tool was called but 'text' parameter was missing",
    };
  }

  // Step 4 - Return success if all checks pass
  return {
    name: "Tool Call Evaluator",
    passed: true,
    score: 1,
    details: `Correctly called '${expectedTool}' with text: "${String(correctToolCall.input.text).substring(0, 50)}..."`,
  };
}

// -----------------------------------------------------------------------------
// TODO: Evaluator 2 - Schema Validity Evaluator
// Checks if the output conforms to the SentimentAnalysis Zod schema
// -----------------------------------------------------------------------------

export function evaluateSchemaValidity(trace: AgentTrace): EvaluatorResult {
  const result = trace.result;

  // Step 1 - Check if result exists
  if (!result) {
    return {
      name: "Schema Validity Evaluator",
      passed: false,
      score: 0,
      details: "No result was produced by the agent",
    };
  }

  // Step 2 - Validate against Zod schema
  const validation = SentimentAnalysisSchema.safeParse(result);

  if (!validation.success) {
    const errors = validation.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      name: "Schema Validity Evaluator",
      passed: false,
      score: 0,
      details: `Schema validation failed: ${errors}`,
    };
  }

  // Step 3 - Check all required fields are valid
  const requiredFields = ["text", "sentiment", "confidence", "keywords", "explanation"];
  const validFields = requiredFields.filter((field) => {
    const value = result[field as keyof typeof result];
    return value !== undefined && value !== null && (Array.isArray(value) ? value.length >= 0 : true);
  });

  if (validFields.length !== requiredFields.length) {
    const missingFields = requiredFields.filter((f) => !validFields.includes(f));
    return {
      name: "Schema Validity Evaluator",
      passed: false,
      score: validFields.length / requiredFields.length,
      details: `Missing or invalid fields: ${missingFields.join(", ")}`,
    };
  }

  // Step 4 - Return success if all fields valid
  return {
    name: "Schema Validity Evaluator",
    passed: true,
    score: 1,
    details: `All required fields are valid: text, sentiment (${result.sentiment}), confidence (${result.confidence}), keywords (${result.keywords.length} items), explanation`,
  };
}

// -----------------------------------------------------------------------------
// TODO: Evaluator 3 - Accuracy Evaluator
// Checks if the detected sentiment matches the expected sentiment
// -----------------------------------------------------------------------------

export function evaluateAccuracy(
  trace: AgentTrace,
  testCase: SentimentTestCase
): EvaluatorResult {
  const result = trace.result;

  // Step 1 - Check if result exists
  if (!result) {
    return {
      name: "Accuracy Evaluator",
      passed: false,
      score: 0,
      details: "No result was produced by the agent",
    };
  }

  const actualSentiment = result.sentiment;
  const expectedSentiment = testCase.expectedSentiment;

  // Step 2 - Compare actual vs expected sentiment
  if (actualSentiment === expectedSentiment) {
    // Exact match - perfect score
    return {
      name: "Accuracy Evaluator",
      passed: true,
      score: 1,
      details: `Correctly detected sentiment as '${actualSentiment}' (expected: '${expectedSentiment}') with ${result.confidence} confidence`,
    };
  }

  // Step 3 - Return appropriate result based on match
  // Partial credit for neutral when expecting positive/negative or vice versa
  if (
    (expectedSentiment === "neutral" && actualSentiment !== "neutral") ||
    (actualSentiment === "neutral" && expectedSentiment !== "neutral")
  ) {
    return {
      name: "Accuracy Evaluator",
      passed: false,
      score: 0.5,
      details: `Misclassified as '${actualSentiment}' but expected '${expectedSentiment}' (neutral vs polar mismatch)`,
    };
  }

  // Opposite sentiment - no credit
  return {
    name: "Accuracy Evaluator",
    passed: false,
    score: 0,
    details: `Incorrectly detected sentiment as '${actualSentiment}' when expected '${expectedSentiment}' (opposite polarity)`,
  };
}

// -----------------------------------------------------------------------------
// Run All Evaluators
// -----------------------------------------------------------------------------

export function runEvaluators(
  trace: AgentTrace,
  testCase: SentimentTestCase
): EvaluationReport {
  const evaluators: EvaluatorResult[] = [
    evaluateToolCall(trace),
    evaluateSchemaValidity(trace),
    evaluateAccuracy(trace, testCase),
  ];

  const overallPassed = evaluators.every(e => e.passed);
  const overallScore = evaluators.reduce((sum, e) => sum + e.score, 0) / evaluators.length;

  return {
    testCase,
    evaluators,
    overallPassed,
    overallScore,
  };
}
