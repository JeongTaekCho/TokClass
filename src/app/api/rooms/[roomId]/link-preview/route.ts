import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { roomHandler } from "@/lib/api/handler";
import { hashed, hitLimit } from "@/lib/api/rate-limit";
import { isPrivateAddress } from "@/lib/net/private-address";

/*
 * 채팅·산출물 링크 미리보기
 * - 방에 들어온 사람(강사·수강생)만 부를 수 있어요.
 * - 내부망 요청(SSRF)을 막으려고 리다이렉트를 직접 따라가며(최대 3번) 매번 주소를 다시 검사해요.
 * - 전체 4초 안에, 앞부분 200KB만 읽어요.
 */

const MAX_REDIRECTS = 3;
const TOTAL_TIMEOUT_MS = 4000;
const MAX_BYTES = 200_000;

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("blocked address");
}

function pick(html: string, re: RegExp) {
  const m = html.match(re);
  return m?.[1]?.trim().replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") ?? null;
}

function meta(html: string, prop: string) {
  return (
    pick(html, new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")) ??
    pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"))
  );
}

const CACHE = { "Cache-Control": "private, max-age=3600" };
const empty = (status = 200) => NextResponse.json({ preview: null }, { status, headers: status === 200 ? CACHE : undefined });

export const GET = roomHandler({}, async ({ actor, search }) => {
  let url: URL;
  try {
    url = new URL(search.get("url") ?? "");
  } catch {
    return empty(400);
  }
  if (!["http:", "https:"].includes(url.protocol)) return empty(400);
  // 미리보기는 부가 기능이라 넘치면 조용히 건너뛰어요 (사람당 1분 30회).
  const who = actor.kind === "participant" ? actor.participant.id : actor.userId;
  if ((await hitLimit(hashed("preview", who), 60, 30)) > 0) return NextResponse.json({ preview: null });

  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
  try {
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);
      res = await fetch(url, { signal, redirect: "manual", headers: { "User-Agent": "TokClassBot/1.0 (+link preview)", Accept: "text/html" } });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!location) break;
      void res.body?.cancel().catch(() => {});
      url = new URL(location, url);
      if (!["http:", "https:"].includes(url.protocol)) return empty();
      res = null;
    }
    if (!res || !res.ok || !(res.headers.get("content-type") ?? "").includes("text/html") || !res.body) return empty();

    const reader = res.body.getReader();
    let html = "";
    const decoder = new TextDecoder();
    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    void reader.cancel().catch(() => {});
    const title = meta(html, "og:title") ?? pick(html, /<title[^>]*>([^<]*)<\/title>/i);
    const description = meta(html, "og:description") ?? meta(html, "description");
    let image = meta(html, "og:image");
    if (image) {
      try {
        image = new URL(image, url).toString();
        if (!image.startsWith("https://")) image = null;
      } catch {
        image = null;
      }
    }
    const preview = title ? { url: url.toString(), title: title.slice(0, 200), description: description?.slice(0, 300) ?? null, image, siteName: meta(html, "og:site_name") ?? url.hostname } : null;
    return NextResponse.json({ preview }, { headers: CACHE });
  } catch (e) {
    console.warn("[link-preview] 실패", (e as Error).message);
    return NextResponse.json({ preview: null });
  }
});
