import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

/** 내부망 주소로의 요청(SSRF)을 막아요. */
function isPrivateAddress(ip: string) {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) !== 4) return false;
  const [a, b] = v4.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
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

/** 채팅 링크 미리보기 (짧은 타임아웃, 앞부분 200KB만 읽기) */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ preview: null }, { status: 400 });
  }
  if (!["http:", "https:"].includes(url.protocol)) return NextResponse.json({ preview: null }, { status: 400 });
  try {
    const host = url.hostname;
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addrs.some((a) => isPrivateAddress(a.address))) return NextResponse.json({ preview: null });

    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      redirect: "follow",
      headers: { "User-Agent": "TokClassBot/1.0 (+link preview)", Accept: "text/html" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html") || !res.body) {
      return NextResponse.json({ preview: null }, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    const reader = res.body.getReader();
    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 200_000) {
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
    return NextResponse.json({ preview }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.warn("[link-preview] 실패", (e as Error).message);
    return NextResponse.json({ preview: null });
  }
}
