// llm.ts — LLM integration utilities (OpenAI-compatible, with fallback parsing)

// In-memory storage for sensitive LLM configuration
let llmConfig: {
  url: string;
  token: string;
  model: string;
  timeout: number;
} = {
  url: "",
  token: "",
  model: "",
  timeout: 60000
};

/**
 * Ask the configured LLM endpoint for a response.
 *
 * Configuration is stored in memory for security. Use setLLMConfig() to configure.
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
  const { url, token, model, timeout: tmo } = llmConfig;

  if (!url)
    throw new Error("No LLM endpoint configured. Use setLLMConfig() to configure.");
  if (!model)
    throw new Error("No LLM model configured. Use setLLMConfig() to configure.");

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
 * Set LLM configuration in memory (secure)
 */
export function setLLMConfig(config: {
  url: string;
  token: string;
  model: string;
  timeout: number;
}): void {
  llmConfig = { ...config };
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured(): boolean {
  return !!(llmConfig.url && llmConfig.model);
}

/**
 * Get LLM configuration (returns current in-memory config)
 */
export function getLLMConfig(): {
  url: string;
  token: string;
  model: string;
  timeout: number;
} {
  return { ...llmConfig };
}

/**
 * Load LLM configuration from localStorage (for migration/backward compatibility)
 * Only loads non-sensitive configuration, requires manual token setting
 */
export function loadLLMConfigFromStorage(): void {
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem("ln.llm.url");
    const model = localStorage.getItem("ln.llm.model");
    const timeout = +(localStorage.getItem("ln.llm.timeout") || "60000");
    
    if (url || model) {
      llmConfig.url = url || "";
      llmConfig.model = model || "";
      llmConfig.timeout = timeout;
      // Note: token is not loaded from localStorage for security
      console.log("Loaded LLM config from storage (excluding token for security)");
    }
  }
}

/**
 * @deprecated Use setLLMConfig() instead for security
 * This function is kept for backward compatibility but logs a warning
 */
export function saveLLMConfig(config: {
  url: string;
  token: string;
  model: string;
  timeout: number;
}): void {
  console.warn("saveLLMConfig() is deprecated. Use setLLMConfig() for secure in-memory storage.");
  setLLMConfig(config);
}
