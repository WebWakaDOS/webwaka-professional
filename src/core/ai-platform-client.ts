/**
 * WebWaka AI Platform Client
 * Blueprint Reference: Part 10.8 — AI Contract Analysis
 *
 * Calls an OpenAI-compatible AI endpoint for document analysis and summarization.
 * The endpoint and API key are injected via environment variables:
 *   AI_API_URL       — base URL (e.g., https://api.openai.com/v1)
 *   AI_API_KEY       — API key
 *   AI_MODEL         — model name (e.g., gpt-4o-mini)
 *
 * Falls back gracefully if AI is not configured (returns null).
 */

export interface AIEnv {
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
}

export interface ContractAnalysisResult {
  summary: string;
  riskyClauses: string[];
  keyTerms: string[];
  recommendations: string[];
}

const DEFAULT_MODEL = 'gpt-4o-mini';

function isAIConfigured(env: AIEnv): boolean {
  return !!(env.AI_API_URL && env.AI_API_KEY);
}

export async function analyzeContract(
  env: AIEnv,
  documentText: string,
  documentTitle: string
): Promise<ContractAnalysisResult | null> {
  if (!isAIConfigured(env)) return null;

  const model = env.AI_MODEL ?? DEFAULT_MODEL;
  const systemPrompt = `You are an expert Nigerian legal document analyst. 
Analyze legal contracts and documents with a focus on Nigerian law, NBA regulations, and local business practices.
Always respond in valid JSON format with the following structure:
{
  "summary": "A concise 2-3 paragraph summary of the document",
  "riskyClauses": ["Array of risky or unusual clauses found, each as a string"],
  "keyTerms": ["Array of key terms, obligations, and dates found"],
  "recommendations": ["Array of specific actionable recommendations for the client"]
}`;

  const userPrompt = `Analyze the following legal document titled "${documentTitle}":

${documentText.slice(0, 12000)}

Provide your analysis in the JSON format specified. Focus on:
1. What the document does and its main purpose
2. Any unusual, one-sided, or risky clauses that could harm the client
3. Key obligations, deadlines, and terms
4. Specific recommendations for negotiation or protection`;

  try {
    const response = await fetch(`${env.AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as ContractAnalysisResult;
    return {
      summary: parsed.summary ?? '',
      riskyClauses: Array.isArray(parsed.riskyClauses) ? parsed.riskyClauses : [],
      keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch {
    return null;
  }
}

export async function getAICompletion(
  env: AIEnv,
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  if (!isAIConfigured(env)) return null;

  const model = env.AI_MODEL ?? DEFAULT_MODEL;
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch(`${env.AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 1500 })
    });
    if (!response.ok) return null;
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export function assembleDocumentFromTemplate(
  templateContent: string,
  variables: Record<string, string>
): string {
  let result = templateContent;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
