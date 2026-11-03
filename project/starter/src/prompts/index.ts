/**
 * Centralized prompt management
 *
 * Export system prompts for all agents and the orchestrator
 */

export {
  buildCodeQualityPrompt,
  buildTestCoveragePrompt,
  buildRefactoringPrompt
} from '../agents/index.js';
