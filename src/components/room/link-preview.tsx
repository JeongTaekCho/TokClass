"use client";

import useSWR from "swr";
import { ExternalLink, Globe } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/lib/client/api";
import { useRoom } from "@/lib/realtime/provider";
import { cn } from "@/lib/utils";

export type Preview = { url: string; title: string; description: string | null; image: string | null; siteName: string };

/** 링크의 제목·설명·대표 이미지(og). 같은 주소는 한 번만 받아요. */
export function useLinkPreview(url: string | null) {
  const { roomId } = useRoom();
  return useLinkPreviewFrom(`/api/rooms/${roomId}/link-preview`, url);
}

/** 미리보기 API 주소를 직접 줘요. 방 밖(내 교안 라이브러리)에서는 `/api/lessons/link-preview`를 써요. */
export function useLinkPreviewFrom(endpoint: string, url: string | null) {
  const { data, isLoading } = useSWR<{ preview: Preview | null }>(url ? `${endpoint}?url=${encodeURIComponent(url)}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });
  return { preview: data?.preview ?? null, isLoading };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * 링크 미리보기
 * - compact: 채팅 말풍선 아래 작은 카드
 * - bookmark: 산출물처럼 링크가 주인공일 때. 대표 이미지를 크게 보여주고, 미리보기를 못 받아도 주소 카드로 열 수 있어요.
 */
export function LinkPreview({ url, variant = "compact", className }: { url: string; variant?: "compact" | "bookmark"; className?: string }) {
  const { preview: p, isLoading } = useLinkPreview(url);

  if (variant === "bookmark") {
    const host = p?.siteName || hostOf(url);
    return (
      <a
        href={p?.url ?? url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={cn(
          "group/bm flex overflow-hidden rounded-lg border border-border/70 bg-surface text-left shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised motion-reduce:hover:translate-y-0 sm:min-h-28",
          className,
        )}
      >
        {isLoading ? (
          <Skeleton className="w-28 shrink-0 rounded-none sm:w-40" />
        ) : p?.image ? (
          <img src={p.image} alt="" className="w-28 shrink-0 bg-sunken object-cover sm:w-40" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden className="flex w-20 shrink-0 items-center justify-center bg-primary-soft text-primary-ink sm:w-28">
            <Globe className="size-7" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-3">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-1 h-3 w-full" />
            </>
          ) : (
            <>
              <span className="line-clamp-2 font-semibold text-foreground">{p?.title ?? url}</span>
              {p?.description && <span className="line-clamp-2 text-sm text-muted-foreground">{p.description}</span>}
            </>
          )}
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{host}</span>
            <ExternalLink aria-hidden className="size-3 shrink-0 opacity-0 transition-opacity group-hover/bm:opacity-100" />
          </span>
        </span>
      </a>
    );
  }

  if (!p) return null;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn("mt-1.5 flex max-w-sm overflow-hidden rounded-md border border-border bg-surface text-left transition-colors hover:border-border-strong", className)}
    >
      {p.image && <img src={p.image} alt="" className="h-auto w-20 shrink-0 object-cover" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="min-w-0 p-2.5">
        <span className="block truncate text-xs text-muted-foreground">{p.siteName}</span>
        <span className="line-clamp-2 text-sm font-medium text-foreground">{p.title}</span>
        {p.description && <span className="line-clamp-2 text-xs text-muted-foreground">{p.description}</span>}
      </span>
    </a>
  );
}
