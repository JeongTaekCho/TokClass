"use client";

import { useState } from "react";
import useSWR from "swr";
import JSZip from "jszip";
import { Download, FileArchive, FileSpreadsheet, FileText, Loader2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { ResultsView } from "@/components/room/activities/results-view";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LABELS } from "@/lib/activities/schema";
import { api, fetcher, setActingAs } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { formatTime } from "@/lib/format";
import type { Report } from "@/lib/data/report";
import type { UnderstandingBucket } from "@/lib/report/aggregate";
import type { Submission } from "@/lib/types";

if (typeof window !== "undefined") setActingAs("instructor");

const KIND_LABELS: Record<string, string> = {
  chat: "채팅",
  question: "질문",
  vote: "공감",
  activity: "활동 응답",
  submission: "산출물",
  feedback: "댓글·스티커",
  understanding: "이해도 표시",
  help: "도움 요청",
  reaction: "반응",
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const SERIES = [
  { key: "red", label: "막혔어요", emoji: "🔴", color: "#dc2626" },
  { key: "yellow", label: "헷갈려요", emoji: "🟡", color: "#ca8a04", hatch: true },
  { key: "green", label: "이해했어요", emoji: "🟢", color: "#16a34a" },
] as const;

/** 이해도 추이: 5분 구간 누적 막대 (색 + 무늬 + 범례 + 표로 구분) */
function TrendChart({ data }: { data: UnderstandingBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">아직 이해도 기록이 없어요.</p>;
  const W = 640;
  const H = 200;
  const pad = { l: 28, r: 8, t: 8, b: 24 };
  const max = Math.max(1, ...data.map((b) => b.green + b.yellow + b.red));
  const bw = (W - pad.l - pad.r) / data.length;
  const barW = Math.max(4, Math.min(28, bw - 4));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, Math.ceil(max / 2), max];
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-3 text-sm" aria-label="범례">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <svg width="14" height="14" aria-hidden>
              <rect width="14" height="14" rx="3" fill={s.color} />
              {"hatch" in s && <rect width="14" height="14" rx="3" fill="url(#tk-hatch)" />}
            </svg>
            {s.emoji} {s.label}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="5분 단위 이해도 추이 누적 막대 그래프. 자세한 수치는 아래 표에 있어요.">
          <defs>
            <pattern id="tk-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.55" />
            </pattern>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#E7E4F2" strokeWidth="1" />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B6880">
                {t}
              </text>
            </g>
          ))}
          {data.map((b, i) => {
            const x = pad.l + i * bw + (bw - barW) / 2;
            let acc = 0;
            return (
              <g key={b.at} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                {SERIES.map((s) => {
                  const v = b[s.key];
                  if (!v) return null;
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  const hgt = Math.max(0, y0 - y1 - 2); // 2px 간격
                  return (
                    <g key={s.key}>
                      <rect x={x} y={y1} width={barW} height={hgt} rx={2} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
                      {"hatch" in s && <rect x={x} y={y1} width={barW} height={hgt} rx={2} fill="url(#tk-hatch)" />}
                    </g>
                  );
                })}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6B6880">
                    {formatTime(b.at)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-0 right-0 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lifted">
            <p className="font-semibold">{formatTime(h.at)}</p>
            {SERIES.map((s) => (
              <p key={s.key}>
                {s.emoji} {s.label} <span className="font-semibold tabular-nums">{h[s.key]}명</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">표로 보기</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1">시각</th>
              {SERIES.slice()
                .reverse()
                .map((s) => (
                  <th key={s.key} className="py-1">
                    {s.emoji} {s.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.at} className="border-b border-border/60">
                <td className="py-1">{formatTime(b.at)}</td>
                <td>{b.green}</td>
                <td>{b.yellow}</td>
                <td>{b.red}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function ReportView({ roomId, title }: { roomId: string; title: string }) {
  const { data, isLoading } = useSWR<{ report: Report }>(`/api/rooms/${roomId}/report`, fetcher);
  const [zipping, setZipping] = useState(false);
  const r = data?.report;

  async function downloadZip() {
    setZipping(true);
    try {
      const { submissions } = await api<{ submissions: Submission[] }>(`/api/rooms/${roomId}/submissions?sort=recent`);
      const zip = new JSZip();
      const rows = [["번호", "작성자", "제목", "종류", "섹션", "파일", "링크", "내용", "베스트"]];
      let n = 0;
      for (const s of submissions) {
        n += 1;
        const prefix = `${String(n).padStart(3, "0")}_${s.author.nickname}`.replace(/[\\/:*?"<>|]/g, "_");
        let fileName = "";
        if (s.fileUrl) {
          const res = await fetch(s.fileUrl);
          if (res.ok) {
            const ext = (s.fileName?.split(".").pop() ?? (s.mime?.split("/")[1] || "bin")).slice(0, 8);
            fileName = `${prefix}.${ext}`;
            zip.file(`files/${fileName}`, await res.blob());
          }
        } else if (s.kind === "text") {
          fileName = `${prefix}.txt`;
          zip.file(`files/${fileName}`, `${s.title}\n\n${s.body}`);
        }
        rows.push([String(n), s.author.nickname, s.title, s.kind, s.section ?? "", fileName, s.url ?? "", s.body, s.isBest ? "O" : ""]);
      }
      const csv = "﻿" + rows.map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n");
      zip.file("목록.csv", csv);
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.slice(0, 40)}_산출물.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`산출물 ${submissions.length}개를 묶었어요.`);
    } catch (e) {
      toastError(e, "ZIP을 만들지 못했어요. 다시 시도해 주세요.");
    } finally {
      setZipping(false);
    }
  }

  const exp = (type: string) => `/api/rooms/${roomId}/export?type=${type}`;

  return (
    <div className="space-y-6">
      <section aria-labelledby="export-title" className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 id="export-title" className="text-lg font-bold">
          기록 내보내기
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={exp("chat-txt")}>
              <FileText aria-hidden /> 채팅 로그 (TXT)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exp("chat-csv")}>
              <FileSpreadsheet aria-hidden /> 채팅 로그 (CSV)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exp("qa-csv")}>
              <FileSpreadsheet aria-hidden /> Q&A (CSV)
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exp("activities-csv")}>
              <FileSpreadsheet aria-hidden /> 투표·퀴즈 결과 (CSV)
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadZip} disabled={zipping}>
            {zipping ? <Loader2 className="animate-spin" aria-hidden /> : <FileArchive aria-hidden />} 산출물 전체 (ZIP)
          </Button>
        </div>
      </section>

      {isLoading || !r ? (
        <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" aria-label="리포트 만드는 중" />
      ) : (
        <>
          <section aria-label="요약 지표" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="참여자" value={`${r.participants}명`} />
            <Tile label="참여율" value={`${Math.round(r.participationRate * 100)}%`} sub="1회 이상 상호작용한 수강생" />
            <Tile label="1인당 평균 상호작용" value={`${r.avgInteractions.toFixed(1)}회`} sub={`전체 ${r.totalInteractions}회`} />
            <Tile label="질문" value={`${r.questionCount}개`} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft" aria-labelledby="trend-title">
            <h2 id="trend-title" className="mb-3 text-lg font-bold">
              이해도 추이 (5분 단위)
            </h2>
            <TrendChart data={r.understandingTrend} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft" aria-labelledby="topq-title">
              <h2 id="topq-title" className="mb-3 text-lg font-bold">
                공감 많은 질문 TOP {r.topQuestions.length}
              </h2>
              {r.topQuestions.length === 0 && <p className="text-sm text-muted-foreground">질문이 없었어요.</p>}
              <ol className="space-y-2">
                {r.topQuestions.map((q, i) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-hover">{i + 1}</span>
                    <span className="flex-1">{q.body}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp className="size-3.5" aria-hidden /> {q.votes}
                      {q.answered && <span className="ml-1 text-green-700">✓ 답변</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-soft" aria-labelledby="kind-title">
              <h2 id="kind-title" className="mb-3 text-lg font-bold">
                상호작용 종류
              </h2>
              <table className="w-full text-left text-sm tabular-nums">
                <tbody>
                  {Object.entries(r.byKind)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <tr key={k} className="border-b border-border/60">
                        <th className="py-1.5 font-medium">{KIND_LABELS[k] ?? k}</th>
                        <td className="py-1.5 text-right">{v}회</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {r.leastActive.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  참여가 적었던 수강생: {r.leastActive.map((p) => `${p.nickname}(${p.count})`).join(", ")}
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="act-results-title">
            <h2 id="act-results-title" className="mb-3 text-lg font-bold">
              활동별 결과
            </h2>
            {r.activities.length === 0 && <p className="text-sm text-muted-foreground">진행한 활동이 없어요.</p>}
            <div className="grid gap-4 lg:grid-cols-2">
              {r.activities.map(({ activity, results }) => (
                <article key={activity.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <p className="text-sm font-semibold text-primary">
                    {ACTIVITY_LABELS[activity.type].emoji} {ACTIVITY_LABELS[activity.type].name}
                  </p>
                  <h3 className="mb-3 font-bold">{activity.title}</h3>
                  <ResultsView results={results} config={activity.config} />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      <p className="text-center text-xs text-muted-foreground">
        <Download className="mr-1 inline size-3" aria-hidden />
        리포트는 집계 기반이에요 (AI 자동 리포트는 이후 버전에서 제공).
      </p>
    </div>
  );
}
