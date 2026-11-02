import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { isPrivateAddress } from "@/lib/net/private-address";

/*
 * 링크 미리보기 가져오기 (채팅·산출물·교안 카드 공용)
 * - 내부망 요청(SSRF)을 막으려고 리다이렉트를 직접 따라가며(최대 3번) 매번 주소를 다시 검사해요.
 * - 전체 4초 안에, 앞부분 200KB만 읽어요.
 */

export type LinkPreviewData = { url: string; title: string; description: string | null; image: string | null; siteName: string };

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

/** 주소의 og 제목·설명·대표 이미지. 못 받으면 null (오류를 던지지 않아요). */
export async function fetchLinkPreview(start: URL): Promise<LinkPreviewData | null> {
  let url = start;
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
      if (!["http:", "https:"].includes(url.protocol)) return null;
      res = null;
    }
    if (!res || !res.ok || !(res.headers.get("content-type") ?? "").includes("text/html") || !res.body) return null;

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
    return title ? { url: url.toString(), title: title.slice(0, 200), description: description?.slice(0, 300) ?? null, image, siteName: meta(html, "og:site_name") ?? url.hostname } : null;
  } catch (e) {
    console.warn("[link-preview] 실패", (e as Error).message);
    return null;
  }
}

/** 요청의 ?url= 을 읽어요. http(s)가 아니면 null. */
export function previewTarget(raw: string | null): URL | null {
  try {
    const url = new URL(raw ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
