import { NextResponse } from "next/server";

import { instructorHandler } from "@/lib/api/handler";
import { hashed, hitLimit } from "@/lib/api/rate-limit";
import { fetchLinkPreview, previewTarget } from "@/lib/net/link-preview";

const CACHE = { "Cache-Control": "private, max-age=3600" };

/** 내 교안 라이브러리에서 링크 카드를 만들 때 제목·설명 채우기 (승인된 강사). 방 미리보기와 같은 한도를 나눠 써요. */
export const GET = instructorHandler({}, async ({ req, access }) => {
  const url = previewTarget(req.nextUrl.searchParams.get("url"));
  if (!url) return NextResponse.json({ preview: null }, { status: 400 });
  if ((await hitLimit(hashed("preview", access.user.id), 60, 30)) > 0) return NextResponse.json({ preview: null });
  const preview = await fetchLinkPreview(url);
  return NextResponse.json({ preview }, preview ? { headers: CACHE } : undefined);
});
