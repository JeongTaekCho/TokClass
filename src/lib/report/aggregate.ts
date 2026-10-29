/** 리포트·실시간 패널에서 쓰는 순수 집계 함수 (단위 테스트 대상) */

export type SignalStatus = "green" | "yellow" | "red";
export type UnderstandingEvent = { participant_id: string; status: SignalStatus; created_at: string };
export type UnderstandingBucket = { at: string; green: number; yellow: number; red: number };

/**
 * 이해도 추이: 시간 구간마다 "그 시점에 각 수강생이 마지막으로 표시한 상태"를 세요.
 * 이벤트가 없는 구간도 직전 상태를 이어 받아요.
 */
export function bucketUnderstanding(events: UnderstandingEvent[], bucketMs = 5 * 60_000): UnderstandingBucket[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const start = Math.floor(new Date(sorted[0]!.created_at).getTime() / bucketMs) * bucketMs;
  const end = new Date(sorted[sorted.length - 1]!.created_at).getTime();
  const state = new Map<string, SignalStatus>();
  const out: UnderstandingBucket[] = [];
  let i = 0;
  for (let t = start; t <= end; t += bucketMs) {
    const bucketEnd = t + bucketMs;
    while (i < sorted.length && new Date(sorted[i]!.created_at).getTime() < bucketEnd) {
      state.set(sorted[i]!.participant_id, sorted[i]!.status);
      i++;
    }
    const b: UnderstandingBucket = { at: new Date(t).toISOString(), green: 0, yellow: 0, red: 0 };
    for (const s of state.values()) b[s] += 1;
    out.push(b);
    if (out.length > 500) break; // 비정상적으로 긴 범위 방지
  }
  return out;
}

export type Interaction = { participantId: string | null; kind: string };

/** 참여율 = 1회 이상 상호작용한 수강생 / 전체 수강생, 1인당 평균 상호작용 수 */
export function participationStats(participantIds: string[], interactions: Interaction[]) {
  const ids = new Set(participantIds);
  const perPerson = new Map<string, number>();
  const byKind: Record<string, number> = {};
  for (const it of interactions) {
    if (!it.participantId || !ids.has(it.participantId)) continue;
    perPerson.set(it.participantId, (perPerson.get(it.participantId) ?? 0) + 1);
    byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
  }
  const total = [...perPerson.values()].reduce((a, b) => a + b, 0);
  const participants = ids.size;
  return {
    participants,
    activeParticipants: perPerson.size,
    participationRate: participants ? perPerson.size / participants : 0,
    avgInteractions: participants ? total / participants : 0,
    totalInteractions: total,
    byKind,
    perPerson: Object.fromEntries(perPerson),
  };
}

/** 공감 많은 질문 TOP N (숨긴 질문 제외, 공감 같으면 먼저 올라온 순) */
export function topQuestions<T extends { vote_count: number; created_at: string; hidden?: boolean }>(questions: T[], n = 5): T[] {
  return questions
    .filter((q) => !q.hidden)
    .sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at))
    .slice(0, n);
}

export function percent(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}
