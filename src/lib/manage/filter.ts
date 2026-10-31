/** 수강생 관리 화면 필터 (클라이언트·테스트 공용) */

export type ParticipantState = "online" | "offline" | "kicked";
export type StateFilter = ParticipantState | "all";

type Row = { id: string; roomId: string; nickname: string; kicked: boolean };

export function participantState(p: { id: string; kicked: boolean }, online: ReadonlySet<string>): ParticipantState {
  if (p.kicked) return "kicked";
  return online.has(p.id) ? "online" : "offline";
}

export function filterParticipants<T extends Row>(
  list: readonly T[],
  opts: { roomId: string | null; query: string; state: StateFilter; online: ReadonlySet<string> },
): T[] {
  const q = opts.query.trim().toLowerCase();
  return list.filter(
    (p) =>
      (!opts.roomId || p.roomId === opts.roomId) &&
      (!q || p.nickname.toLowerCase().includes(q)) &&
      (opts.state === "all" || participantState(p, opts.online) === opts.state),
  );
}

/** 접속 중 → 오프라인 → 강퇴됨, 같은 상태는 닉네임 순 */
export function sortParticipants<T extends Row>(list: readonly T[], online: ReadonlySet<string>): T[] {
  const rank: Record<ParticipantState, number> = { online: 0, offline: 1, kicked: 2 };
  return [...list].sort((a, b) => rank[participantState(a, online)] - rank[participantState(b, online)] || a.nickname.localeCompare(b.nickname, "ko"));
}
