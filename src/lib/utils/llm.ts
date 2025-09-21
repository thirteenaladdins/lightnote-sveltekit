// llm.ts — LLM integration utilities (OpenAI-compatible, with fallback parsing)

/**
 * Ask the configured LLM endpoint for a response.
 *
 * Config expected in localStorage:
 *   ln.llm.url   → full endpoint (e.g. "https://api.together.xyz/v1/chat/completions")
 *   ln.llm.token → "Bearer sk-..." or raw token
 *   ln.llm.model → model id (provider-specific, e.g. "meta-llama/Meta-Llama-3-8B-Instruct-Turbo")
 *   ln.llm.timeout → ms (optional, default 60s)
 */
export async function llmAsk({
  prompt,
  system = "You are a helpful assistant.",
  temperature = 0.2,
}: {
  prompt: string;
  system?: string;
  temperature?: number;
}): Promise<string> {
  const url = localStorage.getItem("ln.llm.url");
  const token = localStorage.getItem("ln.llm.token");
  const model = localStorage.getItem("ln.llm.model");
  const tmo = +(localStorage.getItem("ln.llm.timeout") || "60000");

  if (!url)
    throw new Error("No LLM endpoint configured. Set ln.llm.url in Settings.");
  if (!model)
    throw new Error("No LLM model configured. Set ln.llm.model in Settings.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token)
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;

  const body = {
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };

  // Timeout controller
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), tmo);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await safeText(res);
      throw new Error(
        `LLM request failed: ${res.status} ${res.statusText} — ${errText}`
      );
    }

    const data = await res.json();

    // Standard OpenAI-style
    const text =
      data?.choices?.[0]?.message?.content ||
      // Some providers return plain output fields
      data?.output ||
      data?.response ||
      data?.content ||
      data?.text ||
      "";

    return String(text).trim();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") 
      throw new Error("LLM request timed out.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Helpers
async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Parse JSON with loose parsing for LLM responses
 */
export function parseJSONLoose(s: string): any {
  const m = s && s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = m ? m[1] : s || "";

  const stripComments = (input: string): string =>
    input
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, (match, prefix) => (prefix ?? ""));

  const sanitized = stripComments(raw);
  try {
    return JSON.parse(sanitized);
  } catch {}
  try {
    const fixed = sanitized
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured(): boolean {
  const url = localStorage.getItem("ln.llm.url");
  const model = localStorage.getItem("ln.llm.model");
  return !!(url && model);
}

/**
 * Get LLM configuration
 */
export function getLLMConfig(): {
  url: string;
  token: string;
  model: string;
  timeout: number;
} {
  return {
    url: localStorage.getItem("ln.llm.url") || "",
    token: localStorage.getItem("ln.llm.token") || "",
    model: localStorage.getItem("ln.llm.model") || "",
    timeout: +(localStorage.getItem("ln.llm.timeout") || "60000"),
  };
}

/**
 * Save LLM configuration
 */
export function saveLLMConfig(config: {
  url: string;
  token: string;
  model: string;
  timeout: number;
}): void {
  localStorage.setItem("ln.llm.url", config.url);
  localStorage.setItem("ln.llm.token", config.token);
  localStorage.setItem("ln.llm.model", config.model);
  localStorage.setItem("ln.llm.timeout", config.timeout.toString());
}
