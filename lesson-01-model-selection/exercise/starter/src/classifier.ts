/**
 * Exercise: Claude Model Selection
 *
 * Scenario: A support team handles thousands of tickets daily.
 * Simple questions need fast responses; complex issues need deeper analysis.
 *
 * This exercise reinforces how to pick the right model for different tasks.
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODELS, ModelKey } from "./models.js";
import { calculateCost, logStats, displayComparison, ensureParsedResponse } from "./helpers.js";
import { Message, Model } from "@anthropic-ai/sdk/resources";
import { TICKETS } from "./sample-tickets.js";
import dotenv from "dotenv";
dotenv.config();

/**Initialize the Anthropic client */
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


// -----------------------------------------------------------------------------
// Helper: Call Claude and return the response with usage stats
// -----------------------------------------------------------------------------

async function callClaude(modelKey: ModelKey, system: string, userMessage: string) {
  const model = MODELS[modelKey];
  const start = Date.now();

  const rawResponse = await client.messages.create({
    model: model.id,
    max_tokens: 1024,
    system: system,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });
  const response = ensureParsedResponse(rawResponse as any); // Required for Vocareum

  const ms = Date.now() - start;
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  const cost = calculateCost(inputTokens, outputTokens, model);

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  return { text, inputTokens, outputTokens, ms, cost };
}

// -----------------------------------------------------------------------------
// Step 1: Haiku - Fast classification for simple tickets
// -----------------------------------------------------------------------------

async function testHaiku() {
  console.log(`\n---  Haiku for Simple Classification ---\n`);

  const system = `You are a support ticket classifier. Analyze the ticket and respond with ONLY the priority level: LOW, MEDIUM, HIGH, or URGENT.`;

  const result = await callClaude("haiku", system, TICKETS.simple);

  console.log(`Result: ${result.text}`);
  logStats(result);

  console.log(`\n💡 Haiku is perfect for simple tasks - fast and cheap!`);
}

// -----------------------------------------------------------------------------
// Step 2: Sonnet - Balanced analysis for moderate tickets
// -----------------------------------------------------------------------------

async function testSonnet() {
  console.log("\n---  Sonnet for Detailed Analysis ---\n");

  const system = `You are a support analyst. Analyze the ticket and provide:
1. Priority level (LOW, MEDIUM, HIGH, URGENT)
2. Issue category
3. Key details (2-3 bullet points)
4. Recommended action

Keep response concise and structured.`;

  const result = await callClaude("sonnet", system, TICKETS.moderate);

  console.log(`Result:\n${result.text}`);
  logStats(result);

  console.log(`\n💡 Sonnet balances quality and cost - great for most tasks!`);
}

// -----------------------------------------------------------------------------
// Step 3: Opus - Complex reasoning for multi-issue tickets
// -----------------------------------------------------------------------------

async function testOpus() {
  console.log("\n---  Opus for Complex Reasoning ---\n");

  const system = `You are a senior support manager. Analyze this complex support ticket thoroughly and provide:
1. Issue Summary - Overview of all issues
2. Root Cause Analysis - Hypothesis for each issue
3. Impact Assessment - Business and technical impact
4. Prioritized Action Plan - Step-by-step resolution strategy

Think deeply about the interconnections between issues.`;

  const result = await callClaude("opus", system, TICKETS.complex);

  console.log(`Result:\n${result.text}`);
  logStats(result);

  console.log(`\n💡 Opus excels at complex, multi-factor reasoning!`);
}

// -----------------------------------------------------------------------------
// Step 4: Compare all models on the same task
// -----------------------------------------------------------------------------

async function testCompare() {
  console.log("\n---  Model Comparison ---\n");

  const system = `Analyze this support ticket and provide:
1. Priority level (low/medium/high/urgent)
2. Main issue
3. One recommended action`;

  const results = [];
  const modelKeys: ModelKey[] = ["haiku", "sonnet", "opus"];

  for (const modelKey of modelKeys) {
    const result = await callClaude(modelKey, system, TICKETS.moderate);
    results.push({
      model: MODELS[modelKey].name,
      ms: result.ms,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: result.cost,
    });
  }

  displayComparison(results);

  console.log("\n💡 Pick the right model for the job!");
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("  EXERCISE: Claude Model Selection");
  console.log("  Scenario: Customer Support Ticket System");
  console.log("=".repeat(60));

  await testHaiku();
  await testSonnet();
  await testOpus();
  await testCompare();
}

main().catch(console.error);
