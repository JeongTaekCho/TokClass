/** 교안 규칙 (서버·화면·테스트 공용, DB 접근 없음) */

export const LESSON_COLORS = ["indigo", "coral", "purple", "green", "blue", "orange", "slate", "red"] as const;
export type LessonColor = (typeof LESSON_COLORS)[number];

export const LESSON_COLOR_LABEL: Record<LessonColor, string> = {
  indigo: "남색",
  coral: "코랄",
  purple: "보라",
  green: "초록",
  blue: "파랑",
  orange: "주황",
  slate: "회색",
  red: "빨강",
};

export const LESSON_KINDS = ["link", "copy"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

/** 한도 (서버에서 확인해요) */
export const LESSON_LIMITS = {
  roomGroups: 50,
  roomCards: 500,
  ownerPacks: 100,
  packCards: 300,
  categories: 20,
} as const;

/** 글자 수 (이모지·결합 문자를 한 글자로 세요) */
export function graphemeLength(s: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let n = 0;
    for (const _ of new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(s)) n++;
    return n;
  }
  return [...s].length;
}

/** http/https 주소인지 (`javascript:` 등은 막아요) */
export function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 복사 카드 본문을 나눠요. `[ ... ]` 부분은 "내 상황으로 바꿀 곳"이라 화면에서 강조해요. */
export function splitPlaceholders(text: string): { text: string; placeholder: boolean }[] {
  const out: { text: string; placeholder: boolean }[] = [];
  const re = /\[[^\[\]\n]{1,200}\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), placeholder: false });
    out.push({ text: m[0], placeholder: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), placeholder: false });
  return out;
}

export type RuleResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * 라이브러리에서 방으로 가져올 때 한도 확인.
 * - 새 그룹으로 넣으면 방 그룹 수가 1 늘어요.
 * - 기존 그룹에 넣으면 그 그룹 카드 수도 묶음당 한도를 넘으면 안 돼요.
 */
export function planRoomImport(input: {
  roomGroups: number;
  roomCards: number;
  adding: number;
  newGroup: boolean;
  /** 기존 그룹에 넣을 때 그 그룹의 카드 수 */
  targetCards?: number;
}): RuleResult<{ adding: number }> {
  if (input.adding < 1) return { ok: false, error: "가져올 카드가 없어요." };
  if (input.newGroup && input.roomGroups + 1 > LESSON_LIMITS.roomGroups) {
    return { ok: false, error: `교안 묶음은 방마다 ${LESSON_LIMITS.roomGroups}개까지 넣을 수 있어요.` };
  }
  if (input.roomCards + input.adding > LESSON_LIMITS.roomCards) {
    const left = Math.max(0, LESSON_LIMITS.roomCards - input.roomCards);
    return { ok: false, error: `교안 카드는 방마다 ${LESSON_LIMITS.roomCards}장까지예요. 지금 ${left}장 더 넣을 수 있어요.` };
  }
  const inGroup = (input.newGroup ? 0 : (input.targetCards ?? 0)) + input.adding;
  if (inGroup > LESSON_LIMITS.packCards) {
    return { ok: false, error: `한 묶음에는 카드를 ${LESSON_LIMITS.packCards}장까지 넣을 수 있어요.` };
  }
  return { ok: true, value: { adding: input.adding } };
}

/**
 * 고른 카드를 기존 그룹에 넣을 때 분류 맞추기.
 * 그룹에 없는 분류는 자리가 남으면 그룹 분류에 덧붙이고, 자리가 없으면 카드 분류를 비워요.
 */
export function mergeCategories(groupCategories: string[], cardCategories: (string | null)[]) {
  const categories = [...groupCategories];
  for (const c of cardCategories) {
    if (c && !categories.includes(c) && categories.length < LESSON_LIMITS.categories) categories.push(c);
  }
  return { categories, cardCategory: (c: string | null) => (c && categories.includes(c) ? c : null) };
}

/**
 * 새 순서와 지금 순서를 비교해서 바뀐 행만 골라요 (위·아래 이동은 보통 두 행만 바뀌어요).
 * current: id → { parent, position }
 */
export function diffOrder(
  next: { parent: string; ids: string[] }[],
  current: Map<string, { parent: string; position: number }>,
): { id: string; parent: string; position: number }[] {
  const changed: { id: string; parent: string; position: number }[] = [];
  for (const g of next) {
    g.ids.forEach((id, position) => {
      const now = current.get(id);
      if (!now || now.parent !== g.parent || now.position !== position) changed.push({ id, parent: g.parent, position });
    });
  }
  return changed;
}

/** 배열 안에서 한 칸 옮기기 (끝이면 그대로) */
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir;
  if (index < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}
