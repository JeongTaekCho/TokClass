/**
 * 검색어를 PostgREST `or=(col.ilike.*q*)` 필터에 안전하게 넣을 수 있게 다듬어요.
 * 필터 구문을 깨는 문자(, ( ) " \)와 LIKE 와일드카드(% _ *)를 지우고 길이를 제한해요. 비면 null.
 */
export function searchTerm(q: unknown, max = 50): string | null {
  if (typeof q !== "string") return null;
  const cleaned = q.replace(/[,()"\\%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return cleaned || null;
}

/** 여러 컬럼 중 하나라도 포함하면 맞는 PostgREST or 필터 */
export function ilikeAny(columns: string[], term: string) {
  return columns.map((c) => `${c}.ilike.*${term}*`).join(",");
}
