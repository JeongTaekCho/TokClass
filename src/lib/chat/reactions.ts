import type { MessageReaction } from "@/lib/types";

/** 강사가 누른 반응의 reactor 키 */
export const INSTRUCTOR_REACTOR = "instructor";

export type ReactionRow = {
  message_id: string;
  participant_id: string | null;
  emoji: string;
  created_at: string;
  participant?: { nickname: string } | null;
};

/** 반응 행을 메시지별로 묶어요. 이모지는 처음 눌린 순서대로 놓여요. */
export function groupReactions(rows: ReactionRow[]): Map<string, MessageReaction[]> {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byMessage = new Map<string, Map<string, MessageReaction>>();
  for (const r of sorted) {
    let emojis = byMessage.get(r.message_id);
    if (!emojis) byMessage.set(r.message_id, (emojis = new Map()));
    let entry = emojis.get(r.emoji);
    if (!entry) emojis.set(r.emoji, (entry = { emoji: r.emoji, count: 0, reactors: [], names: [] }));
    entry.count += 1;
    entry.reactors.push(r.participant_id ?? INSTRUCTOR_REACTOR);
    entry.names.push(r.participant_id ? (r.participant?.nickname ?? "알 수 없음") : "강사");
  }
  return new Map([...byMessage].map(([id, emojis]) => [id, [...emojis.values()]]));
}

/** 내 반응을 뒤집어요 (낙관적 업데이트용). 서버 결과가 오면 그걸로 덮어써요. */
export function toggleReaction(list: MessageReaction[], emoji: string, me: { key: string; name: string }): MessageReaction[] {
  const found = list.find((r) => r.emoji === emoji);
  if (!found) return [...list, { emoji, count: 1, reactors: [me.key], names: [me.name] }];
  const i = found.reactors.indexOf(me.key);
  const next =
    i >= 0
      ? { ...found, count: found.count - 1, reactors: found.reactors.filter((_, j) => j !== i), names: found.names.filter((_, j) => j !== i) }
      : { ...found, count: found.count + 1, reactors: [...found.reactors, me.key], names: [...found.names, me.name] };
  return next.count > 0 ? list.map((r) => (r === found ? next : r)) : list.filter((r) => r !== found);
}
