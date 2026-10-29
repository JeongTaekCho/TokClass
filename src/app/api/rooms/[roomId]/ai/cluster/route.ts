import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { looksLikeQuestion, mergeClusters, toPromptInput, type ClusterSource } from "@/lib/ai/cluster";
import { getLlmProvider } from "@/lib/ai/provider";
import { db } from "@/lib/supabase/admin";

/** [질문 정리하기]: Q&A + 채팅 질문을 비슷한 것끼리 묶어요 (서버에서만 호출, 방당 일일 한도). */
export const POST = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, actor }) => {
  const provider = getLlmProvider();
  if (!provider) throw new ApiError(503, "AI 키가 설정되지 않아 이 기능을 쓸 수 없어요.", "ai_disabled");

  const [qs, msgs] = await Promise.all([
    db().from("questions").select("body, vote_count").eq("room_id", roomId).eq("hidden", false).order("vote_count", { ascending: false }).limit(150),
    db().from("messages").select("body").eq("room_id", roomId).eq("hidden", false).not("participant_id", "is", null).order("created_at", { ascending: false }).limit(300),
  ]);
  const sources: ClusterSource[] = [
    ...(must(qs) as { body: string; vote_count: number }[]).map((q, i) => ({ id: `qa${i}`, text: q.body, source: "qa" as const, votes: q.vote_count })),
    ...(must(msgs) as { body: string }[]).filter((m) => looksLikeQuestion(m.body)).map((m, i) => ({ id: `c${i}`, text: m.body, source: "chat" as const, votes: 0 })),
  ];
  if (sources.length < 2) throw new ApiError(400, "정리할 질문이 아직 부족해요. 질문이 2개 이상 모이면 다시 눌러 주세요.");

  const { data: ok, error } = await db().rpc("consume_ai_quota", { p_room: roomId, p_limit: actor.settings.aiDailyLimit });
  if (error) throw error;
  if (!ok) throw new ApiError(429, `오늘 AI 정리 한도(${actor.settings.aiDailyLimit}회)를 다 썼어요. 방 설정에서 한도를 바꿀 수 있어요.`);

  const { inputs, byId } = toPromptInput(sources);
  try {
    const result = await provider.clusterQuestions(inputs);
    return { clusters: mergeClusters(result, byId), total: inputs.length, createdAt: new Date().toISOString() };
  } catch (e) {
    console.error("[ai] 질문 묶기 실패", provider.name, e);
    throw new ApiError(502, "AI가 지금 응답하지 않아요. 잠시 후 다시 시도해 주세요.");
  }
});
