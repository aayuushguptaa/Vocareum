import Anthropic from '@anthropic-ai/sdk';
import type { ReviewReport } from './types/report-types';
import { ReviewError, ErrorCodes, withRetry, withTimeout } from './utils/error-handler.js';
import { logger, logReviewStart, logReviewComplete, logReviewError, logAgentStart, logAgentComplete } from './utils/logger.js';
import { RateLimiter } from './utils/rate-limiter.js';
import {
  CodeQualityResult,
  TestCoverageResult,
  RefactoringSuggestion
} from './types/index.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * GitHub PR file information
 */
interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unchanged' | 'unknown';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  contents?: string; // File contents from GitHub
}

/**
 * Subagent analysis results
 */
interface SubagentResults {
  codeQuality: CodeQualityResult[];
  testCoverage: TestCoverageResult[];
  refactorings: RefactoringSuggestion[];
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 *
 * Workflow:
 * 1. Fetch PR files from GitHub via MCP
 * 2. Spawn 3 specialized subagents in parallel:
 *    - Code Quality Analyzer: Security, performance, best practices
 *    - Test Coverage Analyzer: Identify untested code paths
 *    - Refactoring Suggester: Modernization and pattern improvements
 * 3. Aggregate results into comprehensive ReviewReport
 * 4. Generate formatted reports (MD, HTML, JSON)
 */
export class CodeReviewOrchestrator {
  private client: Anthropic;
  private model: string;
  private timeout: number;
  private maxRetries: number;
  private rateLimiter: RateLimiter;

  constructor(options: OrchestratorOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: options.baseURL || process.env.ANTHROPIC_BASE_URL
    });
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.timeout = options.timeout || 30000; // 30 second timeout per subagent
    this.maxRetries = options.maxRetries || 3;

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      maxRequestsPerMinute: 50,
      maxTokensPerMinute: 100000,
      maxConcurrent: 5
    });
  }

  /**
   * Review a pull request using parallel subagent analysis
   *
   * This is the main entry point for the orchestrator.
   * It coordinates the entire review workflow:
   * 1. Fetches PR files from GitHub
   * 2. Runs 3 specialized subagents in parallel
   * 3. Aggregates their results
   * 4. Returns a comprehensive ReviewReport
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();

    try {
      logReviewStart(owner, repo, prNumber);

      // Step 1: Fetch PR files from GitHub
      logger.debug('Fetching PR files', { owner, repo, prNumber });
      const prFiles = await this.fetchPRFiles(owner, repo, prNumber);
      logger.info('PR files fetched', {
        owner,
        repo,
        prNumber,
        fileCount: prFiles.length
      });

      // Step 2: Run subagents in parallel
      logger.debug('Spawning subagents', {
        owner,
        repo,
        prNumber,
        subagentCount: 3
      });
      const subagentResults = await this.runSubagentsInParallel(
        owner,
        repo,
        prNumber,
        prFiles
      );
      logger.info('Subagents completed', {
        owner,
        repo,
        prNumber,
        subagentCount: 3
      });

      // Step 3: Aggregate results into ReviewReport
      const duration = Date.now() - startTime;
      const report = this.aggregateResults(
        owner,
        repo,
        prNumber,
        prFiles,
        subagentResults,
        duration
      );

      logReviewComplete(owner, repo, prNumber, report.summary.overallScore, duration);

      return report;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logReviewError(owner, repo, prNumber, error instanceof Error ? error : new Error(errorMsg));
      throw error;
    }
  }

  /**
   * Fetch pull request files from GitHub using API
   *
   * This simulates fetching PR files through GitHub MCP server.
   * In a real implementation, this would use the GitHub MCP tool.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Array of PR files
   */
  private async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<PRFile[]> {
    try {
      // TODO: In Phase 4, this will use GitHub MCP server
      // For now, return mock/sample files for demonstration
      // In real use: Use MCP GitHub tool to fetch files

      const mockFiles: PRFile[] = [
        {
          filename: 'src/utils/api.ts',
          status: 'modified',
          additions: 45,
          deletions: 12,
          changes: 57,
          contents: `// API utility functions\nexport async function fetchUserData(userId: string) {\n  const response = await fetch(\`/api/users/\${userId}\`);\n  return response.json();\n}`
        },
        {
          filename: 'src/components/UserCard.tsx',
          status: 'added',
          additions: 89,
          deletions: 0,
          changes: 89,
          contents: `import React from 'react';\n\ninterface UserCardProps {\n  name: string;\n  email: string;\n}\n\nexport const UserCard: React.FC<UserCardProps> = ({ name, email }) => {\n  return <div>{name} - {email}</div>;\n};`
        },
        {
          filename: 'tests/api.test.ts',
          status: 'modified',
          additions: 23,
          deletions: 5,
          changes: 28,
          contents: `import { fetchUserData } from '../src/utils/api';\n\ndescribe('API functions', () => {\n  test('fetchUserData returns user', async () => {\n    const user = await fetchUserData('123');\n    expect(user).toBeDefined();\n  });\n});`
        }
      ];

      logger.debug('Mock PR files generated', {
        fileCount: mockFiles.length,
        files: mockFiles.map(f => f.filename)
      });

      return mockFiles;
    } catch (error) {
      throw new ReviewError(
        `Failed to fetch PR files: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.GITHUB_API_ERROR,
        { owner, repo, prNumber }
      );
    }
  }

  /**
   * Run subagents in parallel to analyze PR files
   *
   * Spawns 3 subagents concurrently with:
   * 1. Rate limiting to prevent API throttling
   * 2. Retry logic with exponential backoff for resilience
   * 3. Timeout handling to prevent hanging
   *
   * Subagents:
   * - Code Quality Analyzer: Security, performance, best practices
   * - Test Coverage Analyzer: Untested paths and edge cases
   * - Refactoring Suggester: Modernization and improvements
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @param files - PR files to analyze
   * @returns Combined results from all subagents
   */
  private async runSubagentsInParallel(
    owner: string,
    repo: string,
    prNumber: number,
    files: PRFile[]
  ): Promise<SubagentResults> {
    try {
      logger.debug('Spawning subagents', {
        fileCount: files.length,
        agentNames: ['code-quality', 'test-coverage', 'refactoring']
      });

      // Run all subagents in parallel with rate limiting and error handling
      const [codeQualityResults, testCoverageResults, refactoringResults] = await Promise.all([
        this.runSubagentWithErrorHandling(
          'code-quality',
          () => this.runCodeQualityAnalyzer(owner, repo, prNumber, files)
        ),
        this.runSubagentWithErrorHandling(
          'test-coverage',
          () => this.runTestCoverageAnalyzer(owner, repo, prNumber, files)
        ),
        this.runSubagentWithErrorHandling(
          'refactoring',
          () => this.runRefactoringSuggester(owner, repo, prNumber, files)
        )
      ]);

      return {
        codeQuality: codeQualityResults,
        testCoverage: testCoverageResults,
        refactorings: refactoringResults
      };
    } catch (error) {
      throw new ReviewError(
        `Subagent analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.AGENT_FAILED,
        { owner, repo, prNumber }
      );
    }
  }

  /**
   * Run a single subagent with error handling, retry, timeout, and rate limiting
   *
   * Wraps subagent execution with:
   * 1. Rate limiting to respect API quotas
   * 2. Timeout protection (30 seconds)
   * 3. Retry logic with exponential backoff
   *
   * @param agentName - Name of the agent for logging
   * @param agentFn - Function that runs the agent
   * @returns The result from the subagent
   */
  private async runSubagentWithErrorHandling<T>(
    agentName: string,
    agentFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    logAgentStart(agentName, 'analysis');

    try {
      // Acquire rate limit slot (estimated 5000 tokens per subagent call)
      await this.rateLimiter.acquire(5000);

      // Wrap with timeout (30 seconds) and retry logic (3 attempts with exponential backoff)
      const result = await withTimeout(
        () => withRetry(agentFn, this.maxRetries, 1000),
        this.timeout,
        `Agent ${agentName} exceeded ${this.timeout}ms timeout`
      );

      const duration = Date.now() - startTime;
      logAgentComplete(agentName, 'analysis', duration);

      // Release the rate limit slot
      this.rateLimiter.release(3000); // Actual tokens used

      return result;
    } catch (error) {
      this.rateLimiter.release(); // Always release the slot
      logger.error(`Subagent ${agentName} failed`, {
        agent: agentName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Run Code Quality Analyzer subagent
   * Analyzes code for security, performance, and best practices
   */
  private async runCodeQualityAnalyzer(
    owner: string,
    repo: string,
    prNumber: number,
    files: PRFile[]
  ): Promise<CodeQualityResult[]> {
    logger.debug('Code Quality Analyzer starting', {
      fileCount: files.length,
      agent: 'code-quality'
    });

    // TODO: Phase 3 - Replace with actual subagent invocation
    // For now, return mock results
    const mockResults: CodeQualityResult[] = files
      .filter(f => !f.filename.endsWith('.test.ts'))
      .map(file => ({
        file: file.filename,
        issues: [
          {
            line: 5,
            severity: 'medium',
            category: 'best-practice',
            description: 'Missing error handling for async operations',
            suggestion: 'Add try-catch block around fetch call'
          }
        ],
        overallScore: 78,
        summary: 'Code follows most best practices but needs error handling improvements'
      }));

    logger.debug('Code Quality Analyzer completed', {
      resultCount: mockResults.length,
      agent: 'code-quality'
    });

    return mockResults;
  }

  /**
   * Run Test Coverage Analyzer subagent
   * Identifies untested code paths and suggests tests
   */
  private async runTestCoverageAnalyzer(
    owner: string,
    repo: string,
    prNumber: number,
    files: PRFile[]
  ): Promise<TestCoverageResult[]> {
    logger.debug('Test Coverage Analyzer starting', {
      fileCount: files.length,
      agent: 'test-coverage'
    });

    // TODO: Phase 3 - Replace with actual subagent invocation
    // For now, return mock results
    const mockResults: TestCoverageResult[] = files
      .filter(f => !f.filename.endsWith('.test.ts'))
      .map(file => ({
        file: file.filename,
        hasTests: true,
        testFiles: ['tests/api.test.ts'],
        untestedPaths: [
          {
            type: 'branch',
            location: 'fetchUserData error handling',
            priority: 'high',
            reasoning: 'Network error scenarios not tested',
            suggestedTest: 'test("handles network errors gracefully")'
          }
        ],
        coverageEstimate: 65,
        summary: 'Basic coverage exists but edge cases need more tests'
      }));

    logger.debug('Test Coverage Analyzer completed', {
      resultCount: mockResults.length,
      agent: 'test-coverage'
    });

    return mockResults;
  }

  /**
   * Run Refactoring Suggester subagent
   * Suggests code modernization and pattern improvements
   */
  private async runRefactoringSuggester(
    owner: string,
    repo: string,
    prNumber: number,
    files: PRFile[]
  ): Promise<RefactoringSuggestion[]> {
    logger.debug('Refactoring Suggester starting', {
      fileCount: files.length,
      agent: 'refactoring'
    });

    // TODO: Phase 3 - Replace with actual subagent invocation
    // For now, return mock results
    const mockResults: RefactoringSuggestion[] = files
      .filter(f => !f.filename.endsWith('.test.ts'))
      .map(file => ({
        file: file.filename,
        suggestions: [
          {
            type: 'modernize',
            location: 'fetchUserData function',
            impact: 'low',
            description: 'Consider using native fetch with AbortController',
            before: 'const response = await fetch(`/api/users/${userId}`);',
            after: 'const controller = new AbortController();\nconst response = await fetch(`/api/users/${userId}`, { signal: controller.signal });',
            benefits: 'Better timeout handling and cancellation support'
          }
        ],
        summary: 'Modern async patterns could improve robustness'
      }));

    logger.debug('Refactoring Suggester completed', {
      resultCount: mockResults.length,
      agent: 'refactoring'
    });

    return mockResults;
  }

  /**
   * Aggregate subagent results into a comprehensive ReviewReport
   *
   * Combines results from all 3 subagents and calculates:
   * - Overall quality score
   * - Critical issues count
   * - High priority tests needed
   * - Refactoring opportunities
   * - Top recommendations ranked by priority
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @param files - Analyzed PR files
   * @param results - Subagent analysis results
   * @param duration - Total analysis duration in ms
   * @returns Comprehensive ReviewReport
   */
  private aggregateResults(
    owner: string,
    repo: string,
    prNumber: number,
    files: PRFile[],
    results: SubagentResults,
    duration: number
  ): ReviewReport {
    // Calculate overall score (weighted average)
    const avgQualityScore = results.codeQuality.length > 0
      ? Math.round(results.codeQuality.reduce((sum, r) => sum + r.overallScore, 0) / results.codeQuality.length)
      : 50;

    const avgCoverageScore = results.testCoverage.length > 0
      ? Math.round(results.testCoverage.reduce((sum, r) => sum + r.coverageEstimate, 0) / results.testCoverage.length)
      : 50;

    const overallScore = Math.round((avgQualityScore * 0.6 + avgCoverageScore * 0.4));

    // Count critical issues
    const criticalIssues = results.codeQuality.reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length,
      0
    );

    // Count high priority test gaps
    const highPriorityTests = results.testCoverage.reduce(
      (sum, r) => sum + r.untestedPaths.filter(p => p.priority === 'high').length,
      0
    );

    // Count refactoring opportunities
    const refactoringOpportunities = results.refactorings.reduce(
      (sum, r) => sum + r.suggestions.length,
      0
    );

    // Build file reviews array
    const fileReviews = files.map(file => {
      const codeQuality = results.codeQuality.find(r => r.file === file.filename) || {
        file: file.filename,
        issues: [],
        overallScore: 75,
        summary: 'No analysis available'
      };

      const testCoverage = results.testCoverage.find(r => r.file === file.filename) || {
        file: file.filename,
        hasTests: false,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 0,
        summary: 'No test data available'
      };

      const refactorings = results.refactorings.find(r => r.file === file.filename) || {
        file: file.filename,
        suggestions: [],
        summary: 'No refactoring suggestions'
      };

      return {
        file: file.filename,
        codeQuality,
        testCoverage,
        refactorings
      };
    });

    // Build recommendations (top issues and suggestions)
    const recommendations = [
      ...results.codeQuality.flatMap(r =>
        r.issues
          .filter(i => i.severity === 'critical' || i.severity === 'high')
          .map(i => ({
            priority: i.severity as 'critical' | 'high' | 'medium' | 'low',
            category: i.category,
            description: i.description,
            files: [r.file]
          }))
      ),
      ...results.testCoverage.flatMap(r =>
        r.untestedPaths
          .filter(p => p.priority === 'high')
          .map(p => ({
            priority: p.priority as 'critical' | 'high' | 'medium' | 'low',
            category: 'test-coverage',
            description: p.reasoning,
            files: [r.file]
          }))
      )
    ]
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 10); // Top 10 recommendations

    const report: ReviewReport = {
      pullRequest: {
        owner,
        repo,
        number: prNumber
      },
      fileReviews,
      summary: {
        totalFiles: files.length,
        overallScore,
        criticalIssues,
        highPriorityTests,
        refactoringOpportunities
      },
      recommendations,
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration,
        agentVersions: {
          'code-quality-analyzer': '1.0.0',
          'test-coverage-analyzer': '1.0.0',
          'refactoring-suggester': '1.0.0'
        }
      }
    };

    logger.info('Results aggregated', {
      owner,
      repo,
      prNumber,
      overallScore,
      criticalIssues,
      fileCount: files.length,
      duration
    });

    return report;
  }
}
