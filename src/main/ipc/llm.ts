const LLM_API_URL = 'https://api.deepseek.com/chat/completions';
const LLM_MODEL = 'deepseek-v4-flash'; 

interface StructuredCompletionOptions {
  thinking?: boolean;
  reasoningEffort?: 'high' | 'max';
  maxTokens?: number;
}

export async function getStructuredCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  options: StructuredCompletionOptions = {},
): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set in environment');
  }

  const { thinking = false, reasoningEffort = 'high', maxTokens = 8000 } = options;
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: maxTokens,
    thinking: { type: thinking ? 'enabled' : 'disabled' },
  };

  if (!thinking) {
    body.temperature = 0.2;
  } else {
    body.reasoning_effort = reasoningEffort;
  }

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM response missing content');
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`LLM returned invalid JSON: ${content}`);
  }
}