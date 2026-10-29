import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { buildClusterPrompt, CLUSTER_SYSTEM_PROMPT, clusterResultSchema, type ClusterResult, type LlmProvider, type QuestionInput } from "@/lib/ai/types";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 50_000, maxRetries: 1 });
  }

  async clusterQuestions(questions: QuestionInput[]): Promise<ClusterResult> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 8000,
      // 안전 분류기가 거절하면 서버가 다른 모델로 이어서 처리해요.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: CLUSTER_SYSTEM_PROMPT,
      output_config: { effort: "low", format: betaZodOutputFormat(clusterResultSchema) },
      messages: [{ role: "user", content: buildClusterPrompt(questions) }],
    });
    if (response.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았어요.");
    if (!response.parsed_output) throw new Error("AI 응답을 해석하지 못했어요.");
    return response.parsed_output;
  }
}
