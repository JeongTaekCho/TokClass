import { NextResponse } from "next/server";

import { roomHandler } from "@/lib/api/handler";
import { hashed, hitLimit } from "@/lib/api/rate-limit";
import { fetchLinkPreview, previewTarget } from "@/lib/net/link-preview";

/*
 * 채팅·산출물 링크 미리보기
 * - 방에 들어온 사람(강사·수강생)만 부를 수 있어요.
 * - 가져오는 방법(SSRF 방지, 시간·크기 제한)은 lib/net/link-preview.ts에 있어요.
 */

const CACHE = { "Cache-Control": "private, max-age=3600" };

export const GET = roomHandler({}, async ({ actor, search }) => {
  const url = previewTarget(search.get("url"));
  if (!url) return NextResponse.json({ preview: null }, { status: 400 });
  // 미리보기는 부가 기능이라 넘치면 조용히 건너뛰어요 (사람당 1분 30회).
  const who = actor.kind === "participant" ? actor.participant.id : actor.userId;
  if ((await hitLimit(hashed("preview", who), 60, 30)) > 0) return NextResponse.json({ preview: null });
  const preview = await fetchLinkPreview(url);
  return NextResponse.json({ preview }, preview ? { headers: CACHE } : undefined);
});
