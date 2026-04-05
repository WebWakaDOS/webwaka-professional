/**
 * WebWaka AI Platform Client — Professional
 * Blueprint Reference: Part 10.8 — AI Contract Analysis
 *
 * All AI calls MUST go through webwaka-ai-platform (vendor-neutral gateway).
 * The AI_PLATFORM_URL env var points at the deployed AI platform worker.
 * AI_PLATFORM_TOKEN is a service-to-service bearer token.
 *
 * Falls back gracefully if the AI platform is not configured (returns null).
 *
 * DO NOT call raw OpenAI/OpenRouter/CF AI endpoints from verticals — use this client.
 */

export interface AIPlatformEnv {
  AI_PLATFORM_URL?: string;   // e.g. https://webwaka-ai-platform.workers.dev
  AI_PLATFORM_TOKEN?: string; // service bearer token
}

export interface ContractAnalysisResult {
  summary: string;
  riskyClauses: string[];
  keyTerms: string[];
  recommendations: string[];
}

function isAIPlatformConfigured(env: AIPlatformEnv): boolean {
  return !!(env.AI_PLATFORM_URL && env.AI_PLATFORM_TOKEN);
}

async function callAIPlatform(
  env: AIPlatformEnv,
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<string | null> {
  if (!isAIPlatformConfigured(env)) return null;

  try {
    const body: Record<string, unknown> = {
      messages,
      max_tokens: options.maxTokens ?? 1500,
      temperature: options.temperature ?? 0.3,
    };
    if (options.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${env.AI_PLATFORM_URL}/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_PLATFORM_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error(`[ai-platform-client] AI platform returned ${response.status}`);
      return null;
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[ai-platform-client] request failed:", String(err));
    return null;
  }
}

export async function analyzeContract(
  env: AIPlatformEnv,
  documentText: string,
  documentTitle: string
): Promise<ContractAnalysisResult | null> {
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

  const content = await callAIPlatform(
    env,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 2000, temperature: 0.3, jsonMode: true }
  );

  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as ContractAnalysisResult;
    return {
      summary: parsed.summary ?? "",
      riskyClauses: Array.isArray(parsed.riskyClauses) ? parsed.riskyClauses : [],
      keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch {
    return null;
  }
}

export async function getAICompletion(
  env: AIPlatformEnv,
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  messages.push({ role: "user", content: prompt });
  return callAIPlatform(env, messages, { maxTokens: 1500, temperature: 0.5 });
}

export function assembleDocumentFromTemplate(
  templateContent: string,
  variables: Record<string, string>
): string {
  let result = templateContent;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

