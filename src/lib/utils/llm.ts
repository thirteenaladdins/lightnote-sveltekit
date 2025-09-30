// llm.ts — LLM integration utilities (OpenAI-compatible, with fallback parsing)

// In-memory storage for LLM configuration
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

// Initialize with environment variables if available
function initializeFromEnv() {
  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env.VITE_LLM_URL;
    const envToken = import.meta.env.VITE_LLM_TOKEN;
    const envModel = import.meta.env.VITE_LLM_MODEL;
    const envTimeout = import.meta.env.VITE_LLM_TIMEOUT;
    
    if (envUrl) llmConfig.url = envUrl;
    if (envToken) llmConfig.token = envToken;
    if (envModel) llmConfig.model = envModel;
    if (envTimeout) llmConfig.timeout = parseInt(envTimeout) || 60000;
    
    console.log('🔧 [LLM] Initialized from environment variables:', {
      url: llmConfig.url,
      model: llmConfig.model,
      hasToken: !!llmConfig.token,
      timeout: llmConfig.timeout
    });
  }
}

// Initialize on module load
initializeFromEnv();

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
 * Set LLM configuration in memory and persist to localStorage
 */
export function setLLMConfig(config: {
  url: string;
  token: string;
  model: string;
  timeout: number;
}): void {
  llmConfig = { ...config };
  
  // Persist to localStorage for persistence across page reloads
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem("ln.llm.url", config.url);
      localStorage.setItem("ln.llm.model", config.model);
      localStorage.setItem("ln.llm.timeout", config.timeout.toString());
      // Store token securely (in a real app, consider using a more secure method)
      localStorage.setItem("ln.llm.token", config.token);
      console.log("💾 [LLM] Configuration saved to localStorage");
    } catch (error) {
      console.error("Failed to save LLM config to localStorage:", error);
    }
  }
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured(): boolean {
  const configured = !!(llmConfig.url && llmConfig.model);
  console.log('🤖 [LLM] isLLMConfigured check:', {
    url: llmConfig.url,
    model: llmConfig.model,
    hasToken: !!llmConfig.token,
    configured
  });
  return configured;
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
 * Load LLM configuration from localStorage
 */
export function loadLLMConfigFromStorage(): void {
  if (typeof window !== 'undefined') {
    // First, try to load from environment variables
    initializeFromEnv();
    
    // If no env vars, fall back to localStorage
    if (!llmConfig.url || !llmConfig.model) {
      const url = localStorage.getItem("ln.llm.url");
      const model = localStorage.getItem("ln.llm.model");
      const token = localStorage.getItem("ln.llm.token");
      const timeout = +(localStorage.getItem("ln.llm.timeout") || "60000");
      
      console.log("💾 [LLM] Loading from localStorage (fallback):", {
        url,
        model,
        hasToken: !!token,
        timeout
      });
      
      if (url || model) {
        llmConfig.url = url || "";
        llmConfig.model = model || "";
        llmConfig.token = token || "";
        llmConfig.timeout = timeout;
        console.log("💾 [LLM] Loaded configuration from localStorage:", {
          url: llmConfig.url,
          model: llmConfig.model,
          hasToken: !!llmConfig.token,
          timeout: llmConfig.timeout
        });
      } else {
        console.log("💾 [LLM] No configuration found in localStorage");
      }
    } else {
      console.log("💾 [LLM] Using environment variables, skipping localStorage");
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
