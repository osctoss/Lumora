import { generateDeterministicExplanation, ExplanationResult } from './deterministic-explainer.js';

export class AiService {
  async explainAlert(alertType: string, details: Record<string, unknown> = {}): Promise<ExplanationResult> {
    // If external AI key is absent, use deterministic rule-based explainer
    return generateDeterministicExplanation(alertType, details);
  }
}

export const aiService = new AiService();
