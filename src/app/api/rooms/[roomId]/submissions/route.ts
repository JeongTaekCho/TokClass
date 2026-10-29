import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { SUBMISSION_SELECT, canSeeSubmission, toSubmissions, type SubmissionRow } from "@/lib/data/submissions";
import { broadcast } from "@/lib/realtime/server";
import { assertRoomPath } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import { submissionCreateSchema } from "@/lib/validation/board";
import { isImageMime, validateUpload } from "@/lib/validation/files";

/** 산출물 목록: ?sort=recent|popular &mine=1 &section= &group= */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, search }) => {
  let q = db().from("submissions").select(SUBMISSION_SELECT).eq("room_id", roomId).limit(500);
  if (search.get("sort") === "popular") q = q.order("is_best", { ascending: false }).order("sticker_count", { ascending: false }).order("comment_count", { ascending: false });
  q = q.order("created_at", { ascending: false });
  if (search.get("mine") === "1") {
    q = actor.kind === "participant" ? q.eq("participant_id", actor.participant.id) : q.is("participant_id", null);
  }
  const section = search.get("section");
  if (section) q = q.eq("section", section);
  const group = search.get("group");
  if (isUuid(group)) q = q.eq("group_id", group);
  const rows = (must(await q) as unknown as SubmissionRow[]).filter((r) => canSeeSubmission(r, actor));
  return { submissions: await toSubmissions(rows, actor) };
});

export const POST = roomHandler({ body: submissionCreateSchema }, async ({ actor, roomId, body }) => {
  let storagePath: string | null = null;
  if (body.kind === "image" || body.kind === "file") {
    try {
      assertRoomPath(roomId, body.path!, "submission");
    } catch {
      throw new ApiError(400, "파일을 다시 올려 주세요.");
    }
    // 확장자는 서버가 정한 저장 경로 기준으로 확인해요 (이미지 압축 시 확장자가 바뀔 수 있어요).
    const problem = validateUpload("submission", { name: body.path!, type: body.mime ?? "", size: body.size ?? 1 });
    if (problem) throw new ApiError(400, problem);
    if (body.kind === "image" && !isImageMime(body.mime)) throw new ApiError(400, "이미지 파일만 올릴 수 있어요.");
    storagePath = body.path!;
  }

  // 조 활동 중이면 우리 조 섹션으로
  let groupId: string | null = null;
  let section = body.section ?? null;
  if (actor.kind === "participant" && actor.settings.groups.active && actor.participant.group_id) {
    groupId = actor.participant.group_id;
    const { data: g } = await db().from("groups").select("name").eq("id", groupId).maybeSingle();
    section = g?.name ?? section;
  }
  if (section && actor.kind === "participant" && !groupId && !actor.settings.sections.includes(section)) section = null;

  const row = must(
    await db()
      .from("submissions")
      .insert({
        room_id: roomId,
        group_id: groupId,
        section,
        participant_id: actor.kind === "participant" ? actor.participant.id : null,
        kind: body.kind,
        title: body.title,
        body: body.body,
        url: body.kind === "link" ? body.url : null,
        storage_path: storagePath,
        file_name: body.fileName ?? null,
        mime: body.mime ?? null,
        size_bytes: body.size ?? 0,
      })
      .select(SUBMISSION_SELECT)
      .single(),
  ) as unknown as SubmissionRow;
  await broadcast(roomId, "submission.changed", { id: row.id, groupId });
  const [submission] = await toSubmissions([row], actor);
  return { submission };
});
