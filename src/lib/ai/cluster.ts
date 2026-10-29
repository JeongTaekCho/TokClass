import type { ClusterResult, QuestionInput } from "@/lib/ai/types";

export type ClusterSource = { id: string; text: string; source: "qa" | "chat"; votes: number };
export type QuestionCluster = { title: string; representative: string; count: number; votes: number; items: { text: string; source: "qa" | "chat" }[] };

/** 채팅에서 질문처럼 보이는 메시지만 골라요. */
export function looksLikeQuestion(text: string) {
  const t = text.trim();
  if (t.length < 4 || t.startsWith("```")) return false;
  return /[?？]\s*$/.test(t) || /(나요|까요|ㄴ가요|는지|인가요|뭔가요|어떻게|왜|무엇|궁금)/.test(t);
}

/** LLM에 보낼 입력: 짧은 id로 바꾸고 길이를 제한해요. */
export function toPromptInput(sources: ClusterSource[], max = 200): { inputs: QuestionInput[]; byId: Map<string, ClusterSource> } {
  const byId = new Map<string, ClusterSource>();
  const inputs = sources.slice(0, max).map((s, i) => {
    const id = `q${i + 1}`;
    byId.set(id, s);
    return { id, text: s.text.replace(/\s+/g, " ").slice(0, 300) };
  });
  return { inputs, byId };
}

/** 모델 결과를 원래 질문과 합쳐 개수·공감 순으로 정렬. 빠진 질문은 "기타"로 모아요. */
export function mergeClusters(result: ClusterResult, byId: Map<string, ClusterSource>): QuestionCluster[] {
  const used = new Set<string>();
  const clusters: QuestionCluster[] = [];
  for (const c of result.clusters) {
    const items: string[] = [];
    for (const id of c.questionIds) {
      if (!byId.has(id) || used.has(id)) continue;
      used.add(id);
      items.push(id);
    }
    if (items.length === 0) continue;
    const srcs = items.map((id) => byId.get(id)!);
    clusters.push({
      title: c.title.slice(0, 40),
      representative: c.representative.slice(0, 300),
      count: srcs.length,
      votes: srcs.reduce((a, s) => a + s.votes, 0),
      items: srcs.map((s) => ({ text: s.text, source: s.source })),
    });
  }
  const leftovers = [...byId.entries()].filter(([id]) => !used.has(id)).map(([, s]) => s);
  if (leftovers.length) {
    clusters.push({ title: "기타", representative: "따로 묶이지 않은 질문", count: leftovers.length, votes: leftovers.reduce((a, s) => a + s.votes, 0), items: leftovers.map((s) => ({ text: s.text, source: s.source })) });
  }
  return clusters.sort((a, b) => (a.title === "기타" ? 1 : b.title === "기타" ? -1 : b.count - a.count || b.votes - a.votes));
}
