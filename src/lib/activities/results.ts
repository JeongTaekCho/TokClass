import type { Activity, ActivityConfig, ActivityResults, ActivityType } from "@/lib/types";

/** 활동 결과 집계 (순수 함수, 단위 테스트 대상) */

export type ResponseInput = { id: string; participantId: string; nickname: string; data: Record<string, unknown>; score: number; createdAt: string };
export type IdeaInput = { id: string; participantId: string | null; nickname: string | null; body: string; color: string; likeCount: number };

export type Viewer = { kind: "instructor" } | { kind: "participant"; id: string } | { kind: "public" };

/** 수강생에게 결과를 지금 보여줘도 되는지 */
export function resultsVisible(activity: Pick<Activity, "type" | "status" | "config">, viewer: Viewer["kind"]): boolean {
  if (viewer === "instructor") return true;
  if (activity.status === "draft") return false;
  if (activity.type === "poll") return activity.config.reveal !== "after" || activity.status === "ended";
  if (activity.type === "quiz") return activity.status === "ended";
  return true;
}

/** 수강생에게 보내는 활동 정보에서 정답을 숨겨요 (종료 후에는 공개). */
export function sanitizeActivity<T extends Pick<Activity, "type" | "status" | "config">>(activity: T, viewer: Viewer["kind"]): T {
  if (viewer === "instructor" || activity.type !== "quiz" || activity.status === "ended") return activity;
  const { correct: _hidden, ...config } = activity.config;
  return { ...activity, config };
}

/**
 * 퀴즈 점수: 정답이면 배점의 50%에 남은 시간 비율만큼 최대 50% 가산. 오답·시간 초과는 0점.
 */
export function scoreQuiz(config: ActivityConfig, selected: number[], elapsedMs: number): number {
  const correct = [...(config.correct ?? [])].sort((a, b) => a - b);
  const sel = [...selected].sort((a, b) => a - b);
  const isCorrect = correct.length === sel.length && correct.every((c, i) => c === sel[i]);
  const limitMs = (config.timeLimitSec ?? 30) * 1000;
  if (!isCorrect || elapsedMs > limitMs + 1500) return 0; // 네트워크 지연 1.5초 허용
  const points = config.points ?? 100;
  const remain = Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  return Math.round(points * (0.5 + 0.5 * remain));
}

/** 워드클라우드 단어 정규화: 공백 정리, 영문 소문자 */
export function normalizeWord(w: string) {
  return w.trim().replace(/\s+/g, " ").toLowerCase();
}

export function computeResults(
  type: ActivityType,
  config: ActivityConfig,
  responses: ResponseInput[],
  opts: { viewer: Viewer; ideas?: IdeaInput[]; likedIdeaIds?: Set<string>; participantCount?: number; leaderboard?: { nickname: string; score: number }[] },
): ActivityResults {
  const showNames = opts.viewer.kind === "instructor";
  switch (type) {
    case "poll":
    case "quiz": {
      const counts = new Array<number>(config.options?.length ?? 0).fill(0);
      for (const r of responses) for (const i of (r.data.selected as number[]) ?? []) if (i >= 0 && i < counts.length) counts[i]! += 1;
      return {
        type,
        total: responses.length,
        counts,
        ...(type === "quiz" ? { correct: config.correct ?? [], leaderboard: config.leaderboard ? (opts.leaderboard ?? []) : undefined } : {}),
      };
    }
    case "wordcloud": {
      const map = new Map<string, { text: string; count: number }>();
      for (const r of responses) {
        for (const w of (r.data.words as string[]) ?? []) {
          const key = normalizeWord(w);
          if (!key) continue;
          const e = map.get(key) ?? { text: w.trim(), count: 0 };
          e.count += 1;
          map.set(key, e);
        }
      }
      return { type, total: responses.length, words: [...map.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)).slice(0, 80) };
    }
    case "ranking": {
      const items = config.items ?? [];
      const n = items.length;
      const sum = new Array<number>(n).fill(0);
      for (const r of responses) {
        ((r.data.order as number[]) ?? []).forEach((itemIdx, rank) => {
          if (itemIdx >= 0 && itemIdx < n) sum[itemIdx]! += rank + 1;
        });
      }
      const total = responses.length;
      return {
        type,
        total,
        items: items
          .map((label, i) => ({ label, avgRank: total ? sum[i]! / total : 0, score: total ? (n + 1) * total - sum[i]! : 0 }))
          .sort((a, b) => (total ? a.avgRank - b.avgRank : 0)),
      };
    }
    case "open":
      return {
        type,
        total: responses.length,
        answers: [...responses]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((r) => ({ id: r.id, text: String(r.data.text ?? ""), nickname: showNames ? r.nickname : null })),
      };
    case "ideas": {
      const ideas = opts.ideas ?? [];
      const me = opts.viewer.kind === "participant" ? opts.viewer.id : null;
      return {
        type,
        total: ideas.length,
        ideas: [...ideas]
          .sort((a, b) => b.likeCount - a.likeCount)
          .map((i) => ({
            id: i.id,
            body: i.body,
            color: i.color,
            likeCount: i.likeCount,
            liked: opts.likedIdeaIds?.has(i.id) ?? false,
            mine: me !== null && i.participantId === me,
            nickname: showNames ? i.nickname : null,
          })),
      };
    }
    case "task": {
      const done = responses.filter((r) => r.data.done === true).length;
      return { type, total: responses.length, done, participants: opts.participantCount ?? responses.length };
    }
  }
}
