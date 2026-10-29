/** CSV 한 칸 이스케이프 (엑셀에서 한글이 깨지지 않도록 파일 앞에 BOM을 붙여요) */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // 수식 주입 방지
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
