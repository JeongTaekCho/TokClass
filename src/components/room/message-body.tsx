import { Fragment } from "react";

import { cn } from "@/lib/utils";

const URL_RE = /(https?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]])/g;

export function firstUrl(text: string) {
  const m = text.replace(/```[\s\S]*?```/g, "").match(URL_RE);
  return m?.[0] ?? null;
}

/** 본문의 링크들 (코드 블록 안은 빼고, 겹치는 주소는 한 번만) */
export function allUrls(text: string, max = 3) {
  return [...new Set(text.replace(/```[\s\S]*?```/g, "").match(URL_RE) ?? [])].slice(0, max);
}

function Inline({ text, inverse }: { text: string; inverse?: boolean }) {
  // `인라인 코드`와 링크만 처리 (HTML은 그대로 텍스트로 출력돼 안전해요)
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={i} className={cn("rounded-md px-1.5 py-0.5 font-mono text-[0.9em]", inverse ? "bg-white/20" : "bg-black/5")}>
              {part.slice(1, -1)}
            </code>
          );
        }
        const chunks = part.split(URL_RE);
        return (
          <Fragment key={i}>
            {chunks.map((c, j) =>
              j % 2 === 1 ? (
                <a key={j} href={c} target="_blank" rel="noopener noreferrer nofollow" className={cn("font-medium break-all underline underline-offset-2", inverse ? "text-white" : "text-primary")}>
                  {c}
                </a>
              ) : (
                <Fragment key={j}>{c}</Fragment>
              ),
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** 채팅 본문: ```코드 블록```, `인라인 코드`, 링크. inverse는 진한 말풍선(내 메시지) 위에서 써요. */
export function MessageBody({ text, className, inverse }: { text: string; className?: string; inverse?: boolean }) {
  const segments = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className={cn("text-[15px] leading-relaxed whitespace-pre-wrap", className)}>
      {segments.map((seg, i) => {
        if (seg.startsWith("```") && seg.endsWith("```") && seg.length >= 6) {
          const inner = seg.slice(3, -3);
          const nl = inner.indexOf("\n");
          const lang = nl > 0 && /^[\w+-]{1,20}$/.test(inner.slice(0, nl).trim()) ? inner.slice(0, nl).trim() : "";
          const code = lang ? inner.slice(nl + 1) : inner.replace(/^\n/, "");
          return (
            <pre key={i} className="scrollbar-thin my-1.5 overflow-x-auto rounded-md bg-ink p-3 text-[13px] leading-snug text-[#f0eee9]">
              {lang && <span className="mb-1 block text-[11px] text-[#a8a298]">{lang}</span>}
              <code className="font-mono">{code}</code>
            </pre>
          );
        }
        return <Inline key={i} text={seg} inverse={inverse} />;
      })}
    </div>
  );
}
