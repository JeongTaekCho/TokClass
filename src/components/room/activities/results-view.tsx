"use client";

import { Check, Heart, Trophy } from "lucide-react";

import type { ActivityConfig, ActivityResults } from "@/lib/types";
import { cn } from "@/lib/utils";

const IDEA_COLORS: Record<string, string> = {
  yellow: "bg-[#fff7c2]",
  pink: "bg-[#ffe1ea]",
  blue: "bg-[#dcecff]",
  green: "bg-[#dcf7e3]",
  purple: "bg-primary-soft",
};
export const IDEA_COLOR_KEYS = Object.keys(IDEA_COLORS) as (keyof typeof IDEA_COLORS)[];
export function ideaColorClass(color: string) {
  return IDEA_COLORS[color] ?? IDEA_COLORS.yellow;
}

function Bars({ labels, counts, total, correct, highlight }: { labels: string[]; counts: number[]; total: number; correct?: number[]; highlight?: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <ul className="space-y-2">
      {labels.map((label, i) => {
        const n = counts[i] ?? 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const isCorrect = correct?.includes(i);
        const mine = highlight?.includes(i);
        return (
          <li key={i}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={cn("flex items-center gap-1.5 font-medium", isCorrect && "font-bold text-green-700")}>
                {isCorrect && <Check className="size-4" aria-label="정답" />}
                {label}
                {mine && <span className="rounded-full bg-primary-soft px-1.5 text-xs text-primary-hover">내 선택</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {n}표 · {pct}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn("h-full rounded-full transition-all duration-500", isCorrect ? "bg-signal-green" : "bg-brand-mix")} style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function WordCloud({ words }: { words: { text: string; count: number }[] }) {
  if (words.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">아직 단어가 없어요.</p>;
  const max = Math.max(...words.map((w) => w.count));
  const min = Math.min(...words.map((w) => w.count));
  const palette = ["text-primary", "text-brand-mix", "text-brand-indigo", "text-primary-hover", "text-coral"];
  // 큰 단어가 가운데 오도록 번갈아 배치
  const arranged: typeof words = [];
  words.forEach((w, i) => (i % 2 === 0 ? arranged.push(w) : arranged.unshift(w)));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-4" role="list" aria-label="워드클라우드">
      {arranged.map((w, i) => {
        const t = max === min ? 0.5 : (w.count - min) / (max - min);
        return (
          <span key={w.text} role="listitem" className={cn("leading-tight font-extrabold", palette[i % palette.length])} style={{ fontSize: `${14 + t * 34}px` }} title={`${w.count}명`}>
            {w.text}
            <span className="sr-only"> ({w.count}명)</span>
          </span>
        );
      })}
    </div>
  );
}

export function ResultsView({
  results,
  config,
  mySelection,
  onLikeIdea,
}: {
  results: ActivityResults;
  config: ActivityConfig;
  mySelection?: number[];
  onLikeIdea?: (id: string) => void;
}) {
  switch (results.type) {
    case "poll":
    case "quiz":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{results.total}명 응답</p>
          <Bars labels={config.options ?? []} counts={results.counts} total={results.total} correct={results.type === "quiz" ? results.correct : undefined} highlight={mySelection} />
          {results.type === "quiz" && results.leaderboard && results.leaderboard.length > 0 && (
            <div className="rounded-xl bg-primary-soft/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-bold">
                <Trophy className="size-4 text-coral" aria-hidden /> 점수판
              </p>
              <ol className="space-y-1 text-sm">
                {results.leaderboard.map((r, i) => (
                  <li key={r.nickname} className="flex justify-between">
                    <span>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`} {r.nickname}
                    </span>
                    <span className="font-semibold tabular-nums">{r.score}점</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );
    case "wordcloud":
      return (
        <div>
          <p className="text-sm text-muted-foreground">{results.total}명 참여</p>
          <WordCloud words={results.words} />
        </div>
      );
    case "ranking":
      return (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{results.total}명 응답 · 평균 순위가 낮을수록 위</p>
          <ol className="space-y-1.5">
            {results.items.map((it, i) => (
              <li key={it.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                <span className="flex-1 font-medium">{it.label}</span>
                {results.total > 0 && <span className="text-sm text-muted-foreground tabular-nums">평균 {it.avgRank.toFixed(1)}위</span>}
              </li>
            ))}
          </ol>
        </div>
      );
    case "open":
      return (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{results.total}개 응답</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.answers.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-card p-3 text-sm whitespace-pre-wrap shadow-soft">
                {a.text}
                {a.nickname && <span className="mt-1 block text-xs text-muted-foreground">— {a.nickname}</span>}
              </li>
            ))}
          </ul>
        </div>
      );
    case "ideas":
      return (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">아이디어 {results.total}개</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.ideas.map((idea) => (
              <li key={idea.id} className={cn("flex min-h-28 flex-col rounded-lg p-3 text-sm shadow-soft", ideaColorClass(idea.color))}>
                <p className="flex-1 font-medium whitespace-pre-wrap">{idea.body}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{idea.nickname ?? (idea.mine ? "나" : "")}</span>
                  {onLikeIdea && !idea.mine ? (
                    <button
                      onClick={() => onLikeIdea(idea.id)}
                      aria-pressed={idea.liked}
                      aria-label={`공감 ${idea.likeCount}개`}
                      className={cn("inline-flex min-h-9 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-full px-2 font-semibold", idea.liked ? "bg-white text-coral" : "hover:bg-white/60")}
                    >
                      <Heart className={cn("size-4", idea.liked && "fill-current")} aria-hidden /> {idea.likeCount}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Heart className="size-4" aria-hidden /> {idea.likeCount}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    case "task": {
      const pct = results.participants ? Math.round((results.done / results.participants) * 100) : 0;
      return (
        <div>
          <p className="mb-1 flex justify-between text-sm font-semibold">
            <span>완료율</span>
            <span className="tabular-nums">
              {results.done}/{results.participants}명 · {pct}%
            </span>
          </p>
          <div className="h-4 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="완료율">
            <div className="h-full rounded-full bg-signal-green transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    }
  }
}
