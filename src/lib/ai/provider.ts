import "server-only";

import { AnthropicProvider } from "@/lib/ai/anthropic";
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible";
import type { LlmProvider } from "@/lib/ai/types";

/**
 * 환경변수로 공급자를 골라요. API 키가 없으면 null → AI 버튼이 비활성화되고 앱은 그대로 동작해요.
 * AI_PROVIDER=anthropic(기본) | openai, AI_API_KEY, AI_MODEL, AI_BASE_URL(openai 호환일 때)
 */
export function getLlmProvider(): LlmProvider | null {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (provider === "openai") return new OpenAICompatibleProvider(key, process.env.AI_MODEL || "gpt-4o-mini", process.env.AI_BASE_URL || undefined);
  return new AnthropicProvider(key, process.env.AI_MODEL || "claude-opus-5-5");
}
