import "server-only";

import { must } from "@/lib/api/handler";

/** Supabase PostgREST max_rows(1000)보다 크게 요청해도 잘려서 와요. 쪽 단위로 끝까지 받아요. */
const PAGE = 1000;

/**
 * max_rows 제한을 넘는 목록을 쪽 단위로 끝까지(최대 max건) 받아요.
 * page에 넘기는 쿼리는 반드시 고유한 정렬(예: created_at, id)을 써야 쪽 경계에서 행이 겹치거나 빠지지 않아요.
 */
export async function fetchPaged<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = 200_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const rows = must(await page(from, Math.min(from + PAGE, max) - 1)) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
