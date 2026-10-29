import { z } from "zod";

export const clusterResultSchema = z.object({
  clusters: z.array(
    z.object({
      title: z.string().describe("묶음 주제를 짧게 (15자 이내)"),
      representative: z.string().describe("묶음을 대표하는 질문 한 문장 (한국어)"),
      questionIds: z.array(z.string()).describe("이 묶음에 속한 질문 id 목록"),
    }),
  ),
});
export type ClusterResult = z.infer<typeof clusterResultSchema>;

export type QuestionInput = { id: string; text: string };

/** LLM 공급자 추상화: 공급자를 바꿔도 라우트 코드는 그대로예요. */
export interface LlmProvider {
  readonly name: string;
  clusterQuestions(questions: QuestionInput[]): Promise<ClusterResult>;
}

export const CLUSTER_SYSTEM_PROMPT = `너는 강의 중 수강생 질문을 정리해 강사에게 보여주는 조교야.
같은 내용을 묻는 질문끼리 묶고, 묶음마다 대표 질문을 한국어 한 문장으로 다듬어 줘.
- 모든 질문 id는 정확히 한 묶음에만 넣어.
- 의미가 다른 질문은 억지로 합치지 말고 따로 둬.
- 인사·잡담처럼 질문이 아닌 것은 "기타" 묶음에 넣어.
- 개인정보나 욕설은 대표 질문에 옮기지 마.`;

export function buildClusterPrompt(questions: QuestionInput[]) {
  return `다음은 수강생 질문 목록이야 (id: 내용).\n\n${questions.map((q) => `${q.id}: ${q.text}`).join("\n")}`;
}
