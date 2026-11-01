import { isIP } from "node:net";

function v4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 || // 멀티캐스트·예약(224.0.0.0/4, 240.0.0.0/4)
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/** 내부망·예약 주소면 true (링크 미리보기 SSRF 방지) */
export function isPrivateAddress(ip: string) {
  const lower = ip.toLowerCase();
  if (isIP(lower) === 4) return v4Private(lower);
  if (lower === "::" || lower === "::1") return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4Private(mapped[1]!);
  return lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("ff") || lower.startsWith("64:ff9b:");
}
