/**
 * @flusk/business-logic
 *
 * Pure business logic functions with NO side effects.
 * All functions are deterministic and testable.
 *
 * Organized by domain:
 * - llmCall: LLM API call processing functions
 * - pattern: Pattern detection and analysis functions
 * - conversion: Optimization suggestion generation
 */
import * as llmCall from './llm-call/index.js';
import * as pattern from './pattern/index.js';
import * as conversion from './conversion/index.js';
export { llmCall, pattern, conversion };
//# sourceMappingURL=index.d.ts.map