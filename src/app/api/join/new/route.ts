import { apiHandler, must, roomSuspended } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { generatePassword, hmacPassword } from "@/lib/auth/password";
import { setParticipantSessionCookie } from "@/lib/auth/participant-session";
import { serverEnv } from "@/lib/env";
import { broadcast } from "@/lib/realtime/server";
import { assertHitLimit, hashed } from "@/lib/api/rate-limit";
import { clientIp } from "@/lib/auth/attempts";
import { getOrCreateDeviceId } from "@/lib/auth/participant-session";
import { CODE_LOCKED_MESSAGE, findRoomByCodeGuarded, isRoomOwnerBlocked } from "@/lib/rooms/lookup";
import { db } from "@/lib/supabase/admin";
import { joinNewSchema } from "@/lib/validation/join";

/** 닉네임으로 새로 참여: 임시 비밀번호를 만들어 한 번만 돌려줘요 (서버에는 HMAC만 저장). */
export const POST = apiHandler({ body: joinNewSchema }, async ({ req, body }) => {
  const room = await findRoomByCodeGuarded(body.code);
  if (!room || room.status !== "active") throw notFound("진행 중인 수업을 찾지 못했어요. 참여코드를 확인해 주세요.");
  if (await isRoomOwnerBlocked(room.owner_id)) throw roomSuspended();
  if (room.locked) throw new ApiError(403, "입장이 마감됐어요. 전에 참여했다면 [비밀번호로 참여하기]를 눌러 주세요.", "locked");

  const full = () => new ApiError(403, `정원(${room.capacity}명)이 다 찼어요. 강사님께 알려 주세요.`, "full");
  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("kicked", false);
  if ((count ?? 0) >= room.capacity) throw full();

  const nickname = body.nickname.trim();
  const { data: taken } = await db().from("participants").select("id").eq("room_id", room.id).ilike("nickname", nickname.replace(/[%_\\]/g, "\\$&")).maybeSingle();
  if (taken) throw new ApiError(409, "이미 이 방에서 쓰고 있는 닉네임이에요. 다른 닉네임을 써 주세요.", "nickname_taken");

  // 가짜 입장으로 정원을 채우는 걸 막아요. 한 강의실이 같은 공인 IP를 쓰니 IP 한도는 정원보다 넉넉하게 둬요.
  const deviceId = await getOrCreateDeviceId();
  await assertHitLimit(hashed(`join:${room.id}:dev`, deviceId), 10 * 60, 5, CODE_LOCKED_MESSAGE);
  await assertHitLimit(hashed(`join:${room.id}:ip`, clientIp(req.headers)), 10 * 60, 150, CODE_LOCKED_MESSAGE);

  // 방 안에서 비밀번호가 겹치지 않도록 (room_id, password_hmac) unique 위반 시 다시 생성
  for (let i = 0; i < 8; i++) {
    const password = generatePassword();
    const { data, error } = await db()
      .from("participants")
      .insert({ room_id: room.id, nickname, password_hmac: hmacPassword(serverEnv.passwordSecret, room.id, password) })
      .select("id, session_version")
      .single();
    if (error?.code === "23505") {
      if (error.message.includes("nickname")) throw new ApiError(409, "이미 이 방에서 쓰고 있는 닉네임이에요. 다른 닉네임을 써 주세요.", "nickname_taken");
      continue;
    }
    const row = must({ data, error }) as { id: string; session_version: number };
    // 정원 직전에 여러 명이 동시에 들어오면 count만으로는 넘칠 수 있어요.
    // 넣은 뒤 입장 순서(created_at, id)로 내 순번을 보고, 정원 밖이면 방금 넣은 나만 빼요.
    const order = must(await db().from("participants").select("id").eq("room_id", room.id).eq("kicked", false).order("created_at").order("id").limit(room.capacity + 50)) as { id: string }[];
    const rank = order.findIndex((p) => p.id === row.id);
    if (rank < 0 || rank >= room.capacity) {
      await db().from("participants").delete().eq("id", row.id);
      throw full();
    }
    await setParticipantSessionCookie({ pid: row.id, rid: room.id, sv: row.session_version }, body.remember);
    await broadcast(room.id, "participant.joined", { participantId: row.id });
    return { roomId: room.id, nickname, password };
  }
  throw new ApiError(500, "비밀번호를 만들지 못했어요. 다시 시도해 주세요.");
});
