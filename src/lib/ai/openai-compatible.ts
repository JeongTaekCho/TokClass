import "server-only";

import { buildClusterPrompt, CLUSTER_SYSTEM_PROMPT, clusterResultSchema, type ClusterResult, type LlmProvider, type QuestionInput } from "@/lib/ai/types";

/** OpenAI 호환 Chat Completions API (다른 공급자로 바꾸고 싶을 때) */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly name = "openai-compatible";

  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl = "https://api.openai.com/v1",
  ) {}

  async clusterQuestions(questions: QuestionInput[]): Promise<ClusterResult> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${CLUSTER_SYSTEM_PROMPT}\n반드시 {"clusters":[{"title":"","representative":"","questionIds":[""]}]} 형식의 JSON만 답해.` },
          { role: "user", content: buildClusterPrompt(questions) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI 요청 실패 (${res.status})`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return clusterResultSchema.parse(JSON.parse(data.choices?.[0]?.message?.content ?? "{}"));
  }
}
