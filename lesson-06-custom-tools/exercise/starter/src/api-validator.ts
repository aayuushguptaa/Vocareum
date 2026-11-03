/**
 * API Performance Validator Custom Tool
 *
 * Deliverable: A custom tool that validates API responses, measures latency,
 * and checks for SLA compliance.
 *
 * Uses createSdkMcpServer and tool helper from Claude Agent SDK.
 */

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

// -----------------------------------------------------------------------------
// Exported Types
// -----------------------------------------------------------------------------

export interface ValidationResult {
  success: boolean;
  statusCode: number;
  latencyMs: number;
  schemaValid: boolean;
  schemaErrors: string[] | null;
  performanceIssues: {
    exceedsSLA: boolean;
    slaThresholdMs: number;
    actualLatencyMs: number;
  };
  breakingChanges: string[] | null;
  warnings: string[];
}

// -----------------------------------------------------------------------------
// Tool Schema
// -----------------------------------------------------------------------------

const validateApiSchema = {
  apiUrl: z.url().describe("The API endpoint URL to validate"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
  expectedFields: z.array(z.string()).describe("Expected fields in response"),
  maxLatencyMs: z.number().positive().describe("SLA threshold in milliseconds"),
  headers: z.record(z.string(), z.string()).optional().describe("Optional headers for auth"),
  body: z.string().optional().describe("Optional request body for POST/PUT"),
};

// -----------------------------------------------------------------------------
// Validation Logic
// -----------------------------------------------------------------------------

async function validateApiResponse(
  apiUrl: URL,
  method: string,
  expectedFields: string[],
  maxLatencyMs: number,
  headers?: Record<string, string>,
  body?: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const schemaErrors: string[] = [];
  const breakingChanges: string[] = [];

  const start = Date.now();
  let statusCode = 0;
  let responseData: Record<string, unknown> = {};

  try {
    // Step 1: Create fetchOptions object
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // Include body only for POST/PUT requests
    if ((method === "POST" || method === "PUT") && body) {
      fetchOptions.body = body;
    }

    // Step 2: Make the fetch request
    const response = await fetch(apiUrl, fetchOptions);
    statusCode = response.status;
    const latencyMs = Date.now() - start;

    // Step 3: Parse response JSON
    try {
      responseData = await response.json();
    } catch {
      schemaErrors.push("Response is not valid JSON");
    }

    // Step 4: Check for missing expected fields (breaking changes)
    const responseFields = Object.keys(responseData);
    for (const expectedField of expectedFields) {
      if (!responseFields.includes(expectedField)) {
        breakingChanges.push(`Missing required field: ${expectedField}`);
      }
    }

    // Step 5: Check for extra fields (potential data leakage)
    const extraFields = responseFields.filter(
      (field) => !expectedFields.includes(field)
    );
    if (extraFields.length > 0) {
      warnings.push(`Unexpected fields in response: ${extraFields.join(", ")}`);
    }

    // Step 6: Check HTTP status code
    if (statusCode < 200 || statusCode >= 300) {
      schemaErrors.push(`HTTP error: ${statusCode}`);
    }

    // Step 7: Check performance against SLA
    const exceedsSLA = latencyMs > maxLatencyMs;
    if (exceedsSLA) {
      warnings.push(
        `Response time ${latencyMs}ms exceeds SLA threshold of ${maxLatencyMs}ms`
      );
    }

    // Step 8: Return ValidationResult
    const isSuccessful = statusCode >= 200 && statusCode < 300 && breakingChanges.length === 0;
    const isSchemaValid = schemaErrors.length === 0 && breakingChanges.length === 0;

    return {
      success: isSuccessful,
      statusCode,
      latencyMs,
      schemaValid: isSchemaValid,
      schemaErrors: schemaErrors.length > 0 ? schemaErrors : null,
      performanceIssues: {
        exceedsSLA,
        slaThresholdMs: maxLatencyMs,
        actualLatencyMs: latencyMs,
      },
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : null,
      warnings,
    };
  } catch (error) {
    // Step 9: Handle network errors
    const latencyMs = Date.now() - start;
    return {
      success: false,
      statusCode: 0,
      latencyMs,
      schemaValid: false,
      schemaErrors: [`Network error: ${(error as Error).message}`],
      performanceIssues: {
        exceedsSLA: true,
        slaThresholdMs: maxLatencyMs,
        actualLatencyMs: latencyMs,
      },
      breakingChanges: null,
      warnings: ["Request failed - could not reach endpoint"],
    };
  }
}

// -----------------------------------------------------------------------------
// Create Custom Tool Server
// -----------------------------------------------------------------------------

// Step 10: Create and export the MCP server
export const apiValidatorServer = createSdkMcpServer({
  name: "api-validator",
  version: "1.0.0",
  tools: [
    tool(
      "validate_api_response",
      "Validates API responses for schema compliance, performance, and SLA adherence. Checks for missing/extra fields, HTTP errors, and response latency against SLA thresholds.",
      validateApiSchema,
      async (args) => {
        const result = await validateApiResponse(
          args.apiUrl as any as URL,
          args.method,
          args.expectedFields,
          args.maxLatencyMs,
          args.headers,
          args.body
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    ),
  ],
});
