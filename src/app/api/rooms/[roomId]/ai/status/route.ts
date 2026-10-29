import { roomHandler } from "@/lib/api/handler";
import { getLlmProvider } from "@/lib/ai/provider";
import { db } from "@/lib/supabase/admin";

/** AI 기능 사용 가능 여부와 오늘 남은 횟수 */
export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, actor }) => {
  const enabled = Boolean(getLlmProvider());
  const limit = actor.settings.aiDailyLimit;
  const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // 한국 날짜
  const { data } = await db().from("ai_usage").select("count").eq("room_id", roomId).eq("day", day).maybeSingle();
  return { enabled, limit, remaining: Math.max(0, limit - (data?.count ?? 0)) };
});
